from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import bcrypt
import psycopg
from fastapi import Depends, FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg.types.json import Json
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # utf-8 avoids Windows mis-reading .env; use POSTGRES_* so @ in passwords does not need URL encoding.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    postgres_user: str = "postgres"
    postgres_password: str = ""
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "student_connect"

    # Legacy: only used if POSTGRES_PASSWORD is empty
    database_url: str | None = None

    jwt_secret: str = "dev-only-change-me"
    jwt_expire_minutes: int = 60 * 24 * 7


settings = Settings()
_conn: Connection | None = None
_chat_blocks_table_ready: bool = False


def _ensure_chat_blocks_table(conn: Connection) -> None:
    """Create chat_blocks if missing (existing DBs may not have run chat_blocks.sql)."""
    global _chat_blocks_table_ready
    if _chat_blocks_table_ready:
        return
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_blocks (
                blocker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (blocker_user_id, blocked_user_id),
                CONSTRAINT chat_blocks_no_self CHECK (blocker_user_id <> blocked_user_id)
            )
            """
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked ON chat_blocks (blocked_user_id)"
        )
    _chat_blocks_table_ready = True


def _new_connection() -> Connection:
    if settings.postgres_password:
        return psycopg.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            dbname=settings.postgres_db,
            user=settings.postgres_user,
            password=settings.postgres_password,
            row_factory=dict_row,
            autocommit=True,
        )
    url = (settings.database_url or "").strip()
    if url:
        return psycopg.connect(url, row_factory=dict_row, autocommit=True)
    raise HTTPException(
        status_code=503,
        detail="Set POSTGRES_PASSWORD (and optional POSTGRES_*) in backend/.env — see .env.example.",
    )


def get_conn() -> Connection:
    global _conn
    if _conn is None or _conn.closed:
        try:
            _conn = _new_connection()
        except HTTPException:
            raise
        except psycopg.OperationalError as e:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cannot connect to PostgreSQL. Check POSTGRES_* in backend/.env "
                    "(password, host, database name student_connect)."
                ),
            ) from e
    else:
        # If connection is in a failed transaction state, rollback and reset
        try:
            if _conn.status != psycopg.connections.ConnStatus.OK:
                try:
                    _conn.rollback()
                except:
                    pass
                _conn.close()
                _conn = _new_connection()
        except:
            pass
    return _conn


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB connects on first auth request (lazy), so a wrong DATABASE_URL does not block startup.
    yield
    global _conn
    if _conn is not None and not _conn.closed:
        _conn.close()
        _conn = None


app = FastAPI(title="Student Connect API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    # Any localhost port (Vite may use 5173, 5174, … if the default is busy)
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|\[::1\]):[0-9]+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=256)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    id: int
    name: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.jwt_secret,
        algorithm="HS256",
    )


def get_current_user_id(authorization: Annotated[str | None, Header()] = None) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(sub)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_optional_user_id(authorization: Annotated[str | None, Header()] = None) -> int | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except JWTError:
        return None


def compute_read_time(content: str) -> str:
    n = len(content.split())
    mins = max(1, (n + 199) // 200)
    return f"{mins} min"


def _blog_date(dt) -> str:
    if dt is None:
        return ""
    if hasattr(dt, "date"):
        return dt.date().isoformat()
    return str(dt)[:10]


def _blog_datetime_iso(dt) -> str:
    if dt is None:
        return ""
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


class ProfilePayload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(max_length=255)
    bio: str = Field(default="", max_length=10000)
    major: str = Field(default="", max_length=255)
    year: str = Field(default="", max_length=100)
    interests: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    avatar: str = Field(default="", max_length=5_000_000)
    linkedin: str = Field(default="", max_length=512)
    github: str = Field(default="", max_length=512)


def _row_to_profile(row: dict) -> ProfilePayload:
    return ProfilePayload(
        name=row["display_name"],
        email=row["display_email"],
        bio=row["bio"] or "",
        major=row["major"] or "",
        year=row["year"] or "",
        interests=list(row["interests"] or []),
        skills=list(row["skills"] or []),
        avatar=row["avatar"] or "",
        linkedin=row["linkedin"] or "",
        github=row["github"] or "",
    )


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/auth/register", response_model=TokenResponse)
def register(body: RegisterBody):
    conn = get_conn()
    pw_hash = hash_password(body.password)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, full_name)
                VALUES (%s, %s, %s)
                RETURNING id, full_name, email
                """,
                (body.email.lower().strip(), pw_hash, body.name.strip()),
            )
            row = cur.fetchone()
        conn.commit()
    except psycopg.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")

    assert row is not None
    token = create_token(row["id"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=row["id"], name=row["full_name"], email=row["email"]),
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(body: LoginBody):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, full_name, password_hash FROM users WHERE email = %s",
            (body.email.lower().strip(),),
        )
        row = cur.fetchone()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(row["id"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=row["id"], name=row["full_name"], email=row["email"]),
    )


@app.get("/api/profile", response_model=ProfilePayload)
def get_profile(user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT display_name, display_email, bio, major, year, interests, skills, avatar, linkedin, github
            FROM profiles WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    if row:
        return _row_to_profile(row)
    with conn.cursor() as cur:
        cur.execute("SELECT full_name, email FROM users WHERE id = %s", (user_id,))
        u = cur.fetchone()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfilePayload(
        name=u["full_name"],
        email=u["email"],
        bio="",
        major="",
        year="",
        interests=[],
        skills=[],
        avatar="",
        linkedin="",
        github="",
    )


@app.put("/api/profile", response_model=ProfilePayload)
def upsert_profile(body: ProfilePayload, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO profiles (
                    user_id, display_name, display_email, bio, major, year,
                    interests, skills, avatar, linkedin, github
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    display_email = EXCLUDED.display_email,
                    bio = EXCLUDED.bio,
                    major = EXCLUDED.major,
                    year = EXCLUDED.year,
                    interests = EXCLUDED.interests,
                    skills = EXCLUDED.skills,
                    avatar = EXCLUDED.avatar,
                    linkedin = EXCLUDED.linkedin,
                    github = EXCLUDED.github,
                    updated_at = NOW()
                """,
                (
                    user_id,
                    body.name.strip(),
                    body.email.strip(),
                    body.bio,
                    body.major,
                    body.year,
                    Json(body.interests),
                    Json(body.skills),
                    body.avatar,
                    body.linkedin,
                    body.github,
                ),
            )
            cur.execute(
                "UPDATE users SET full_name = %s WHERE id = %s",
                (body.name.strip(), user_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT display_name, display_email, bio, major, year, interests, skills, avatar, linkedin, github
            FROM profiles WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    assert row is not None
    return _row_to_profile(row)


class ProfileSearchRow(BaseModel):
    user_id: int
    name: str
    email: str
    major: str
    year: str
    interests: list[str]
    skills: list[str]


@app.get("/api/profiles/search", response_model=list[ProfileSearchRow])
def search_profiles(
    q: str = "",
    major: str = "",
    year: str = "",
    interest: str = "",
):
    """Public directory: all registered users; profile fields when they saved one (no auth)."""
    conn = get_conn()
    conditions: list[str] = ["1=1"]
    params: list = []

    if major.strip():
        conditions.append("COALESCE(p.major, '') = %s")
        params.append(major.strip())
    if year.strip():
        conditions.append("COALESCE(p.year, '') = %s")
        params.append(year.strip())
    if interest.strip():
        like_term = f"%{interest.strip()}%"
        conditions.append(
            "(COALESCE(p.interests::text, '[]') ILIKE %s OR COALESCE(p.skills::text, '[]') ILIKE %s)"
        )
        params.extend([like_term, like_term])

    q_stripped = q.strip()
    if q_stripped:
        term = f"%{q_stripped}%"
        conditions.append(
            "(u.full_name ILIKE %s OR u.email ILIKE %s "
            "OR COALESCE(p.display_name, '') ILIKE %s OR COALESCE(p.display_email, '') ILIKE %s "
            "OR COALESCE(p.major, '') ILIKE %s OR COALESCE(p.bio, '') ILIKE %s "
            "OR COALESCE(p.interests::text, '[]') ILIKE %s OR COALESCE(p.skills::text, '[]') ILIKE %s)"
        )
        params.extend([term, term, term, term, term, term, term, term])

    where_sql = " AND ".join(conditions)
    sql = f"""
        SELECT
            u.id AS user_id,
            COALESCE(NULLIF(BTRIM(p.display_name), ''), u.full_name) AS display_name,
            COALESCE(NULLIF(BTRIM(p.display_email), ''), u.email) AS display_email,
            COALESCE(p.major, '') AS major,
            COALESCE(p.year, '') AS year,
            COALESCE(p.interests, '[]'::jsonb) AS interests,
            COALESCE(p.skills, '[]'::jsonb) AS skills
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE {where_sql}
        ORDER BY display_name
        LIMIT 80
    """
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    out: list[ProfileSearchRow] = []
    for row in rows:
        out.append(
            ProfileSearchRow(
                user_id=row["user_id"],
                name=row["display_name"] or "",
                email=row["display_email"] or "",
                major=row["major"] or "",
                year=row["year"] or "",
                interests=list(row["interests"] or []),
                skills=list(row["skills"] or []),
            )
        )
    return out


# --- Public profile, teammate requests, chat ---


def _user_in_active_teammate_pair(conn: Connection, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM teammate_requests tr
            WHERE tr.status = 'accepted'
              AND tr.accepted_at IS NOT NULL
              AND tr.accepted_at > NOW() - INTERVAL '5 days'
              AND (tr.from_user_id = %s OR tr.to_user_id = %s)
            LIMIT 1
            """,
            (user_id, user_id),
        )
        return cur.fetchone() is not None


class PublicPostSnippet(BaseModel):
    id: int
    excerpt: str
    date: str


class PublicBlogSnippet(BaseModel):
    id: int
    title: str
    date: str
    read_time: str


class PublicProfileOut(BaseModel):
    user_id: int
    name: str
    major: str
    year: str
    bio: str
    interests: list[str]
    skills: list[str]
    linkedin: str
    github: str
    teammate_active: bool
    posts: list[PublicPostSnippet]
    blogs: list[PublicBlogSnippet]


@app.get("/api/profiles/public/{user_id}", response_model=PublicProfileOut)
def get_public_profile_by_id(user_id: int):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                u.id AS user_id,
                COALESCE(NULLIF(BTRIM(p.display_name), ''), u.full_name) AS display_name,
                COALESCE(p.major, '') AS major,
                COALESCE(p.year, '') AS year,
                COALESCE(p.bio, '') AS bio,
                COALESCE(p.interests, '[]'::jsonb) AS interests,
                COALESCE(p.skills, '[]'::jsonb) AS skills,
                COALESCE(p.linkedin, '') AS linkedin,
                COALESCE(p.github, '') AS github
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    teammate_active = _user_in_active_teammate_pair(conn, user_id)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, content, created_at FROM posts
            WHERE author_id = %s ORDER BY created_at DESC LIMIT 12
            """,
            (user_id,),
        )
        prows = cur.fetchall()
    posts: list[PublicPostSnippet] = []
    for pr in prows:
        c = pr["content"] or ""
        posts.append(
            PublicPostSnippet(
                id=pr["id"],
                excerpt=(c[:200] + ("…" if len(c) > 200 else "")),
                date=_blog_date(pr["created_at"]),
            )
        )
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, title, read_time, created_at FROM blogs
            WHERE author_id = %s ORDER BY created_at DESC LIMIT 12
            """,
            (user_id,),
        )
        brows = cur.fetchall()
    blogs = [
        PublicBlogSnippet(
            id=b["id"],
            title=b["title"],
            date=_blog_date(b["created_at"]),
            read_time=b["read_time"] or "1 min",
        )
        for b in brows
    ]
    return PublicProfileOut(
        user_id=row["user_id"],
        name=row["display_name"] or "",
        major=row["major"] or "",
        year=row["year"] or "",
        bio=row["bio"] or "",
        interests=list(row["interests"] or []),
        skills=list(row["skills"] or []),
        linkedin=row["linkedin"] or "",
        github=row["github"] or "",
        teammate_active=teammate_active,
        posts=posts,
        blogs=blogs,
    )


class ResolveUserOut(BaseModel):
    user_id: int


@app.get("/api/profiles/public-resolve", response_model=ResolveUserOut)
def resolve_public_user_by_display_name(name: str = Query(..., min_length=1, max_length=255)):
    """Exact display-name match for legacy ?name= links (fails if ambiguous)."""
    conn = get_conn()
    term = name.strip()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT u.id FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE COALESCE(NULLIF(BTRIM(p.display_name), ''), u.full_name) = %s
            LIMIT 2
            """,
            (term,),
        )
        rows = cur.fetchall()
    if len(rows) != 1:
        raise HTTPException(status_code=404, detail="User not found")
    return ResolveUserOut(user_id=rows[0]["id"])


class TeammateWithState(BaseModel):
    profile_teammate_active: bool
    outgoing_pending: bool
    incoming_pending: bool
    can_send_teammate_request: bool


@app.get("/api/teammate/with/{other_user_id}", response_model=TeammateWithState)
def teammate_state_with(
    other_user_id: int,
    viewer_id: Annotated[int | None, Depends(get_optional_user_id)],
):
    conn = get_conn()
    active = _user_in_active_teammate_pair(conn, other_user_id)
    if viewer_id is None or viewer_id == other_user_id:
        return TeammateWithState(
            profile_teammate_active=active,
            outgoing_pending=False,
            incoming_pending=False,
            can_send_teammate_request=False,
        )
    with conn.cursor() as cur:
        cur.execute(
            "SELECT status FROM teammate_requests WHERE from_user_id = %s AND to_user_id = %s",
            (viewer_id, other_user_id),
        )
        out_row = cur.fetchone()
        cur.execute(
            "SELECT status FROM teammate_requests WHERE from_user_id = %s AND to_user_id = %s",
            (other_user_id, viewer_id),
        )
        in_row = cur.fetchone()
    out_pending = bool(out_row and out_row["status"] == "pending")
    in_pending = bool(in_row and in_row["status"] == "pending")
    viewer_busy = _user_in_active_teammate_pair(conn, viewer_id)
    can_send = (
        not active
        and not out_pending
        and not viewer_busy
    )
    return TeammateWithState(
        profile_teammate_active=active,
        outgoing_pending=out_pending,
        incoming_pending=in_pending,
        can_send_teammate_request=can_send,
    )


class TeammateRequestCreate(BaseModel):
    to_user_id: int = Field(ge=1)
    body: str = Field(min_length=1, max_length=5000)


class TeammateRequestOut(BaseModel):
    id: int
    status: str


def _accepted_still_active_row(accepted_at) -> bool:
    if accepted_at is None:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(days=5)
    at = accepted_at
    if getattr(at, "tzinfo", None) is None:
        at = at.replace(tzinfo=timezone.utc)
    return at > cutoff


@app.post("/api/teammate-requests", response_model=TeammateRequestOut)
def create_teammate_request(body: TeammateRequestCreate, user_id: Annotated[int, Depends(get_current_user_id)]):
    if body.to_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot request yourself")
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM users WHERE id = %s", (body.to_user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
    if _user_in_active_teammate_pair(conn, body.to_user_id):
        raise HTTPException(status_code=400, detail="This student is already in an active teammate partnership")
    if _user_in_active_teammate_pair(conn, user_id):
        raise HTTPException(status_code=400, detail="You are already in an active teammate partnership")
    text = body.body.strip()
    rid: int
    insert_chat = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, status, accepted_at FROM teammate_requests WHERE from_user_id = %s AND to_user_id = %s",
                (user_id, body.to_user_id),
            )
            existing = cur.fetchone()
            if existing:
                st = existing["status"]
                if st == "pending":
                    cur.execute(
                        "UPDATE teammate_requests SET body = %s, created_at = NOW() WHERE id = %s RETURNING id",
                        (text, existing["id"]),
                    )
                    rid = cur.fetchone()["id"]
                    insert_chat = False
                elif st == "accepted" and _accepted_still_active_row(existing["accepted_at"]):
                    raise HTTPException(status_code=400, detail="Already teammates")
                else:
                    cur.execute(
                        """
                        UPDATE teammate_requests SET body = %s, status = 'pending', created_at = NOW(),
                            responded_at = NULL, accepted_at = NULL
                        WHERE id = %s RETURNING id
                        """,
                        (text, existing["id"]),
                    )
                    rid = cur.fetchone()["id"]
            else:
                cur.execute(
                    """
                    INSERT INTO teammate_requests (from_user_id, to_user_id, body, status)
                    VALUES (%s, %s, %s, 'pending') RETURNING id
                    """,
                    (user_id, body.to_user_id, text),
                )
                rid = cur.fetchone()["id"]
            if insert_chat:
                chat_body = f"[Teammate request]\n{text}"
                cur.execute(
                    """
                    INSERT INTO chat_messages (from_user_id, to_user_id, body, teammate_request_id)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (user_id, body.to_user_id, chat_body, rid),
                )
        conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return TeammateRequestOut(id=rid, status="pending")


class TeammateRespondBody(BaseModel):
    action: Literal["accept", "reject"]


@app.patch("/api/teammate-requests/{request_id}/respond", response_model=TeammateRequestOut)
def respond_teammate_request(
    request_id: int,
    body: TeammateRespondBody,
    user_id: Annotated[int, Depends(get_current_user_id)],
):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, from_user_id, to_user_id, status FROM teammate_requests WHERE id = %s",
            (request_id,),
        )
        tr = cur.fetchone()
    if not tr:
        raise HTTPException(status_code=404, detail="Request not found")
    if tr["to_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You cannot respond to this request")
    if tr["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request is no longer pending")
    act = body.action
    try:
        with conn.cursor() as cur:
            if act == "accept":
                cur.execute(
                    """
                    UPDATE teammate_requests SET status = 'accepted', responded_at = NOW(), accepted_at = NOW()
                    WHERE id = %s
                    """,
                    (request_id,),
                )
                reply = "✓ Teammate request accepted."
                new_status = "accepted"
            else:
                cur.execute(
                    """
                    UPDATE teammate_requests SET status = 'rejected', responded_at = NOW(), accepted_at = NULL
                    WHERE id = %s
                    """,
                    (request_id,),
                )
                reply = "Teammate request declined."
                new_status = "rejected"
            cur.execute(
                """
                INSERT INTO chat_messages (from_user_id, to_user_id, body, teammate_request_id)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, tr["from_user_id"], reply, request_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return TeammateRequestOut(id=request_id, status=new_status)


class ChatMessageOut(BaseModel):
    id: int
    from_user_id: int
    to_user_id: int
    from_name: str
    body: str
    created_at: str
    teammate_request_id: int | None = None
    teammate_status: str | None = None
    read_at: str | None = None


def _touch_known_peer(conn: Connection, uid: int, peer_id: int) -> None:
    if uid == peer_id:
        return
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO chat_known_peers (user_id, peer_user_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, peer_user_id) DO UPDATE SET updated_at = NOW()
            """,
            (uid, peer_id),
        )


@app.get("/api/chat/messages", response_model=list[ChatMessageOut])
def list_chat_messages(
    user_id: Annotated[int, Depends(get_current_user_id)],
    with_user_id: int = Query(..., ge=1),
):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT m.id, m.from_user_id, m.to_user_id, m.body, m.created_at,
                   m.teammate_request_id, tr.status AS tr_status, m.read_at,
                   COALESCE(NULLIF(BTRIM(p.display_name), ''), u.full_name) AS from_name
            FROM chat_messages m
            JOIN users u ON u.id = m.from_user_id
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN teammate_requests tr ON tr.id = m.teammate_request_id
            WHERE ((m.from_user_id = %s AND m.to_user_id = %s)
               OR (m.from_user_id = %s AND m.to_user_id = %s))
              AND NOT EXISTS (
                SELECT 1 FROM chat_message_hidden h
                WHERE h.message_id = m.id AND h.user_id = %s
              )
            ORDER BY m.created_at ASC
            """,
            (user_id, with_user_id, with_user_id, user_id, user_id),
        )
        rows = cur.fetchall()
    return [
        ChatMessageOut(
            id=r["id"],
            from_user_id=r["from_user_id"],
            to_user_id=r["to_user_id"],
            from_name=r["from_name"] or "",
            body=r["body"],
            created_at=_blog_datetime_iso(r["created_at"]),
            teammate_request_id=r["teammate_request_id"],
            teammate_status=str(r["tr_status"]) if r["tr_status"] is not None else None,
            read_at=_blog_datetime_iso(r["read_at"]) if r.get("read_at") else None,
        )
        for r in rows
    ]


class ChatSendBody(BaseModel):
    to_user_id: int = Field(ge=1)
    body: str = Field(min_length=1, max_length=2_000_000)


@app.post("/api/chat/messages", response_model=ChatMessageOut)
def send_chat_message(body: ChatSendBody, user_id: Annotated[int, Depends(get_current_user_id)]):
    if body.to_user_id == user_id:
        raise HTTPException(status_code=400, detail="Invalid recipient")
    conn = get_conn()
    _ensure_chat_blocks_table(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM users WHERE id = %s", (body.to_user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        cur.execute(
            """
            SELECT 1 FROM chat_blocks
            WHERE blocker_user_id = %s AND blocked_user_id = %s
            """,
            (body.to_user_id, user_id),
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=403,
                detail="You cannot send messages to this user",
            )
    text = body.body.strip()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO chat_messages (from_user_id, to_user_id, body)
                VALUES (%s, %s, %s)
                RETURNING id, created_at
                """,
                (user_id, body.to_user_id, text),
            )
            ins = cur.fetchone()
            cur.execute(
                """
                SELECT COALESCE(NULLIF(BTRIM(p.display_name), ''), u.full_name) AS from_name
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = %s
                """,
                (user_id,),
            )
            fn = cur.fetchone()
            _touch_known_peer(conn, user_id, body.to_user_id)
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert ins is not None and fn is not None
    return ChatMessageOut(
        id=ins["id"],
        from_user_id=user_id,
        to_user_id=body.to_user_id,
        from_name=fn["from_name"] or "",
        body=text,
        created_at=_blog_datetime_iso(ins["created_at"]),
        teammate_request_id=None,
        teammate_status=None,
        read_at=None,
    )


class MarkReadBody(BaseModel):
    with_user_id: int = Field(ge=1)


@app.post("/api/chat/mark-read")
def mark_chat_read(body: MarkReadBody, user_id: Annotated[int, Depends(get_current_user_id)]):
    """Mark all messages from peer → me in this thread as read (sets read_at)."""
    if body.with_user_id == user_id:
        raise HTTPException(status_code=400, detail="Invalid peer")
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE chat_messages
                SET read_at = COALESCE(read_at, NOW())
                WHERE from_user_id = %s AND to_user_id = %s AND read_at IS NULL
                """,
                (body.with_user_id, user_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


class ChatBlocksOut(BaseModel):
    blocked_user_ids: list[int]
    blocked_by_user_ids: list[int]


class ChatBlockBody(BaseModel):
    peer_user_id: int = Field(ge=1)
    blocked: bool = True


@app.get("/api/chat/blocks", response_model=ChatBlocksOut)
def get_chat_blocks(user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    _ensure_chat_blocks_table(conn)
    with conn.cursor() as cur:
        cur.execute(
            "SELECT blocked_user_id FROM chat_blocks WHERE blocker_user_id = %s",
            (user_id,),
        )
        blocked_user_ids = [int(r["blocked_user_id"]) for r in cur.fetchall()]
        cur.execute(
            "SELECT blocker_user_id FROM chat_blocks WHERE blocked_user_id = %s",
            (user_id,),
        )
        blocked_by_user_ids = [int(r["blocker_user_id"]) for r in cur.fetchall()]
    return ChatBlocksOut(
        blocked_user_ids=blocked_user_ids,
        blocked_by_user_ids=blocked_by_user_ids,
    )


@app.post("/api/chat/block")
def set_chat_block(
    body: ChatBlockBody,
    user_id: Annotated[int, Depends(get_current_user_id)],
):
    if body.peer_user_id == user_id:
        raise HTTPException(status_code=400, detail="Invalid peer")
    conn = get_conn()
    _ensure_chat_blocks_table(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM users WHERE id = %s", (body.peer_user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
    try:
        with conn.cursor() as cur:
            if body.blocked:
                cur.execute(
                    """
                    INSERT INTO chat_blocks (blocker_user_id, blocked_user_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (user_id, body.peer_user_id),
                )
            else:
                cur.execute(
                    """
                    DELETE FROM chat_blocks
                    WHERE blocker_user_id = %s AND blocked_user_id = %s
                    """,
                    (user_id, body.peer_user_id),
                )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


@app.delete("/api/chat/messages/{message_id}")
def delete_chat_message(
    message_id: int,
    user_id: Annotated[int, Depends(get_current_user_id)],
    visibility: Literal["me", "everyone"] = Query("everyone"),
):
    """visibility=everyone: remove the row (sender only). visibility=me: hide for current user only."""
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, from_user_id, to_user_id FROM chat_messages WHERE id = %s",
            (message_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    if row["from_user_id"] != user_id and row["to_user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not part of this conversation")
    if visibility == "everyone" and row["from_user_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the sender can delete a message for everyone",
        )
    try:
        with conn.cursor() as cur:
            if visibility == "everyone":
                cur.execute("DELETE FROM chat_messages WHERE id = %s", (message_id,))
            else:
                cur.execute(
                    """
                    INSERT INTO chat_message_hidden (user_id, message_id)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, message_id) DO NOTHING
                    """,
                    (user_id, message_id),
                )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


@app.delete("/api/chat/thread")
def clear_chat_thread(
    user_id: Annotated[int, Depends(get_current_user_id)],
    with_user_id: int = Query(..., ge=1),
):
    if with_user_id == user_id:
        raise HTTPException(status_code=400, detail="Invalid peer")
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM chat_messages
                WHERE (from_user_id = %s AND to_user_id = %s)
                   OR (from_user_id = %s AND to_user_id = %s)
                """,
                (user_id, with_user_id, with_user_id, user_id),
            )
            _touch_known_peer(conn, user_id, with_user_id)
            _touch_known_peer(conn, with_user_id, user_id)
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


class ChatPartnerOut(BaseModel):
    user_id: int
    name: str
    last_message: str
    last_at: str
    unread_count: int = 0


@app.get("/api/chat/partners", response_model=list[ChatPartnerOut])
def chat_partners(user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT sub.oid FROM (
                SELECT peer_user_id AS oid FROM chat_known_peers WHERE user_id = %s
                UNION
                SELECT CASE WHEN from_user_id = %s THEN to_user_id ELSE from_user_id END AS oid
                FROM chat_messages
                WHERE from_user_id = %s OR to_user_id = %s
            ) sub
            WHERE sub.oid IS NOT NULL
            """,
            (user_id, user_id, user_id, user_id),
        )
        oids = [r["oid"] for r in cur.fetchall()]
    partners: list[ChatPartnerOut] = []
    for oid in oids:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT m.body, m.created_at FROM chat_messages m
                WHERE ((m.from_user_id = %s AND m.to_user_id = %s)
                   OR (m.from_user_id = %s AND m.to_user_id = %s))
                  AND NOT EXISTS (
                    SELECT 1 FROM chat_message_hidden h
                    WHERE h.message_id = m.id AND h.user_id = %s
                  )
                ORDER BY m.created_at DESC LIMIT 1
                """,
                (user_id, oid, oid, user_id, user_id),
            )
            lm = cur.fetchone()
            cur.execute(
                """
                SELECT COALESCE(NULLIF(BTRIM(p.display_name), ''), u.full_name) AS n
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = %s
                """,
                (oid,),
            )
            ur = cur.fetchone()
        if not ur:
            continue
        last_body = ""
        last_at = ""
        if lm:
            b = lm["body"] or ""
            last_body = b[:160] + ("…" if len(b) > 160 else "")
            last_at = _blog_datetime_iso(lm["created_at"])
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)::int AS c FROM chat_messages m
                WHERE from_user_id = %s AND to_user_id = %s AND m.read_at IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM chat_message_hidden h
                    WHERE h.message_id = m.id AND h.user_id = %s
                  )
                """,
                (oid, user_id, user_id),
            )
            uc = cur.fetchone()
        unread = int(uc["c"]) if uc and uc["c"] is not None else 0
        partners.append(
            ChatPartnerOut(
                user_id=oid,
                name=ur["n"] or "",
                last_message=last_body or "No messages yet",
                last_at=last_at,
                unread_count=unread,
            )
        )
    partners.sort(key=lambda p: p.last_at or "1970-01-01T00:00:00+00:00", reverse=True)
    return partners


# --- Blogs (Postgres) ---


class BlogCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(min_length=1)
    category: str = Field(default="Technology", max_length=100)


class BlogUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(min_length=1)
    category: str = Field(default="Technology", max_length=100)


class BlogListItem(BaseModel):
    id: int
    title: str
    excerpt: str
    author_id: int
    author_name: str
    category: str
    read_time: str
    date: str
    like_count: int
    comment_count: int
    liked_by_me: bool


class CommentOut(BaseModel):
    id: int
    body: str
    author_id: int
    author_name: str
    created_at: str
    updated_at: str
    is_mine: bool


class BlogDetailOut(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    author_name: str
    category: str
    read_time: str
    date: str
    like_count: int
    liked_by_me: bool
    comments: list[CommentOut]


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)


class CommentUpdate(BaseModel):
    body: str = Field(min_length=1, max_length=10000)


class LikeState(BaseModel):
    liked: bool
    like_count: int


@app.get("/api/blogs", response_model=list[BlogListItem])
def list_blogs(uid: Annotated[int | None, Depends(get_optional_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT b.id, b.title, b.content, b.category, b.read_time, b.created_at, b.author_id, u.full_name AS author_name,
                (SELECT COUNT(*)::int FROM blog_likes bl WHERE bl.blog_id = b.id) AS like_count,
                (SELECT COUNT(*)::int FROM blog_comments bc WHERE bc.blog_id = b.id) AS comment_count,
                EXISTS(
                    SELECT 1 FROM blog_likes bl2
                    WHERE bl2.blog_id = b.id AND (%s IS NOT NULL AND bl2.user_id = %s)
                ) AS liked_by_me
            FROM blogs b
            JOIN users u ON u.id = b.author_id
            ORDER BY b.created_at DESC
            """,
            (uid, uid),
        )
        rows = cur.fetchall()
    out: list[BlogListItem] = []
    for r in rows:
        excerpt = (r["content"] or "")[:200] + ("..." if len(r["content"] or "") > 200 else "")
        out.append(
            BlogListItem(
                id=r["id"],
                title=r["title"],
                excerpt=excerpt,
                author_id=r["author_id"],
                author_name=r["author_name"],
                category=r["category"],
                read_time=r["read_time"],
                date=_blog_date(r["created_at"]),
                like_count=r["like_count"],
                comment_count=r["comment_count"],
                liked_by_me=bool(r["liked_by_me"]),
            )
        )
    return out


@app.get("/api/blogs/{blog_id}", response_model=BlogDetailOut)
def get_blog(blog_id: int, uid: Annotated[int | None, Depends(get_optional_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT b.id, b.title, b.content, b.category, b.read_time, b.created_at, b.author_id, u.full_name AS author_name,
                (SELECT COUNT(*)::int FROM blog_likes bl WHERE bl.blog_id = b.id) AS like_count,
                EXISTS(
                    SELECT 1 FROM blog_likes bl2
                    WHERE bl2.blog_id = b.id AND (%s IS NOT NULL AND bl2.user_id = %s)
                ) AS liked_by_me
            FROM blogs b
            JOIN users u ON u.id = b.author_id
            WHERE b.id = %s
            """,
            (uid, uid, blog_id),
        )
        b = cur.fetchone()
    if not b:
        raise HTTPException(status_code=404, detail="Blog not found")
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.body, c.user_id AS author_id, u.full_name AS author_name,
                   c.created_at, c.updated_at
            FROM blog_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.blog_id = %s
            ORDER BY c.created_at ASC
            """,
            (blog_id,),
        )
        crows = cur.fetchall()
    comments = [
        CommentOut(
            id=c["id"],
            body=c["body"],
            author_id=c["author_id"],
            author_name=c["author_name"],
            created_at=_blog_datetime_iso(c["created_at"]),
            updated_at=_blog_datetime_iso(c["updated_at"]),
            is_mine=(uid is not None and c["author_id"] == uid),
        )
        for c in crows
    ]
    return BlogDetailOut(
        id=b["id"],
        title=b["title"],
        content=b["content"],
        author_id=b["author_id"],
        author_name=b["author_name"],
        category=b["category"],
        read_time=b["read_time"],
        date=_blog_date(b["created_at"]),
        like_count=b["like_count"],
        liked_by_me=bool(b["liked_by_me"]),
        comments=comments,
    )


@app.post("/api/blogs", response_model=BlogListItem)
def create_blog(body: BlogCreate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    rt = compute_read_time(body.content)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO blogs (author_id, title, content, category, read_time)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, title, content, category, read_time, created_at, author_id
                """,
                (user_id, body.title.strip(), body.content, body.category.strip(), rt),
            )
            row = cur.fetchone()
            cur.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
            an = cur.fetchone()
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert row is not None and an is not None
    excerpt = (row["content"] or "")[:200] + ("..." if len(row["content"] or "") > 200 else "")
    return BlogListItem(
        id=row["id"],
        title=row["title"],
        excerpt=excerpt,
        author_id=row["author_id"],
        author_name=an["full_name"],
        category=row["category"],
        read_time=row["read_time"],
        date=_blog_date(row["created_at"]),
        like_count=0,
        comment_count=0,
        liked_by_me=False,
    )


@app.put("/api/blogs/{blog_id}", response_model=BlogDetailOut)
def update_blog(blog_id: int, body: BlogUpdate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    rt = compute_read_time(body.content)
    with conn.cursor() as cur:
        cur.execute("SELECT author_id FROM blogs WHERE id = %s", (blog_id,))
        b = cur.fetchone()
    if not b:
        raise HTTPException(status_code=404, detail="Blog not found")
    if b["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the author can edit this blog")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE blogs SET title = %s, content = %s, category = %s, read_time = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (body.title.strip(), body.content, body.category.strip(), rt, blog_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return get_blog(blog_id, user_id)


@app.delete("/api/blogs/{blog_id}")
def delete_blog(blog_id: int, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT author_id FROM blogs WHERE id = %s", (blog_id,))
        b = cur.fetchone()
    if not b:
        raise HTTPException(status_code=404, detail="Blog not found")
    if b["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the author can delete this blog")
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM blogs WHERE id = %s", (blog_id,))
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


@app.post("/api/blogs/{blog_id}/like", response_model=LikeState)
def toggle_like(blog_id: int, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM blogs WHERE id = %s", (blog_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Blog not found")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM blog_likes WHERE blog_id = %s AND user_id = %s",
                (blog_id, user_id),
            )
            if cur.fetchone():
                cur.execute(
                    "DELETE FROM blog_likes WHERE blog_id = %s AND user_id = %s",
                    (blog_id, user_id),
                )
                liked = False
            else:
                cur.execute(
                    "INSERT INTO blog_likes (blog_id, user_id) VALUES (%s, %s)",
                    (blog_id, user_id),
                )
                liked = True
            cur.execute(
                "SELECT COUNT(*)::int AS like_count FROM blog_likes WHERE blog_id = %s",
                (blog_id,),
            )
            cnt = cur.fetchone()["like_count"]
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return LikeState(liked=liked, like_count=cnt)


@app.post("/api/blogs/{blog_id}/comments", response_model=CommentOut)
def add_comment(blog_id: int, body: CommentCreate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM blogs WHERE id = %s", (blog_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Blog not found")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO blog_comments (blog_id, user_id, body)
                VALUES (%s, %s, %s)
                RETURNING id, body, created_at, updated_at
                """,
                (blog_id, user_id, body.body.strip()),
            )
            row = cur.fetchone()
            cur.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
            an = cur.fetchone()
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert row is not None and an is not None
    return CommentOut(
        id=row["id"],
        body=row["body"],
        author_id=user_id,
        author_name=an["full_name"],
        created_at=_blog_datetime_iso(row["created_at"]),
        updated_at=_blog_datetime_iso(row["updated_at"]),
        is_mine=True,
    )


@app.patch("/api/blogs/{blog_id}/comments/{comment_id}", response_model=CommentOut)
def update_comment(blog_id: int, comment_id: int, body: CommentUpdate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.body, c.user_id, u.full_name AS author_name, c.created_at, c.updated_at
            FROM blog_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = %s AND c.blog_id = %s
            """,
            (comment_id, blog_id),
        )
        c = cur.fetchone()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if c["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE blog_comments SET body = %s, updated_at = NOW()
                WHERE id = %s AND blog_id = %s
                RETURNING id, body, created_at, updated_at
                """,
                (body.body.strip(), comment_id, blog_id),
            )
            row = cur.fetchone()
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert row is not None
    return CommentOut(
        id=row["id"],
        body=row["body"],
        author_id=user_id,
        author_name=c["author_name"],
        created_at=_blog_datetime_iso(row["created_at"]),
        updated_at=_blog_datetime_iso(row["updated_at"]),
        is_mine=True,
    )


@app.delete("/api/blogs/{blog_id}/comments/{comment_id}")
def delete_comment(blog_id: int, comment_id: int, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM blog_comments WHERE id = %s AND blog_id = %s",
            (comment_id, blog_id),
        )
        c = cur.fetchone()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if c["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM blog_comments WHERE id = %s AND blog_id = %s",
                (comment_id, blog_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


# --- Feed posts ---


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=50000)
    image: str = Field(default="", max_length=5_000_000)


class PostUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=50000)
    image: str = Field(default="", max_length=5_000_000)


class PostListItem(BaseModel):
    id: int
    excerpt: str
    author_id: int
    author_name: str
    author_avatar: str
    date: str
    like_count: int
    comment_count: int
    liked_by_me: bool
    has_image: bool


class PostDetailOut(BaseModel):
    id: int
    content: str
    image: str
    author_id: int
    author_name: str
    date: str
    like_count: int
    liked_by_me: bool
    comments: list[CommentOut]


@app.get("/api/posts", response_model=list[PostListItem])
def list_posts(uid: Annotated[int | None, Depends(get_optional_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.content, p.image, p.created_at, p.author_id, u.full_name AS author_name, COALESCE(prof.avatar, '') AS avatar,
                (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
                (SELECT COUNT(*)::int FROM post_comments pc WHERE pc.post_id = p.id) AS comment_count,
                EXISTS(
                    SELECT 1 FROM post_likes pl2
                    WHERE pl2.post_id = p.id AND (%s IS NOT NULL AND pl2.user_id = %s)
                ) AS liked_by_me
            FROM posts p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN profiles prof ON prof.user_id = p.author_id
            ORDER BY p.created_at DESC
            """,
            (uid, uid),
        )
        rows = cur.fetchall()
    out: list[PostListItem] = []
    for r in rows:
        c = r["content"] or ""
        excerpt = c[:200] + ("..." if len(c) > 200 else "")
        img = r["image"] or ""
        out.append(
            PostListItem(
                id=r["id"],
                excerpt=excerpt,
                author_id=r["author_id"],
                author_name=r["author_name"],
                author_avatar=r["avatar"] or "",
                date=_blog_date(r["created_at"]),
                like_count=r["like_count"],
                comment_count=r["comment_count"],
                liked_by_me=bool(r["liked_by_me"]),
                has_image=bool(img.strip()),
            )
        )
    return out


@app.get("/api/posts/{post_id}", response_model=PostDetailOut)
def get_one_post(post_id: int, uid: Annotated[int | None, Depends(get_optional_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT p.id, p.content, COALESCE(p.image, '') AS image, p.created_at, p.author_id, u.full_name AS author_name,
                (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
                EXISTS(
                    SELECT 1 FROM post_likes pl2
                    WHERE pl2.post_id = p.id AND (%s IS NOT NULL AND pl2.user_id = %s)
                ) AS liked_by_me
            FROM posts p
            JOIN users u ON u.id = p.author_id
            WHERE p.id = %s
            """,
            (uid, uid, post_id),
        )
        p = cur.fetchone()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.body, c.user_id AS author_id, u.full_name AS author_name,
                   c.created_at, c.updated_at
            FROM post_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.post_id = %s
            ORDER BY c.created_at ASC
            """,
            (post_id,),
        )
        crows = cur.fetchall()
    comments = [
        CommentOut(
            id=c["id"],
            body=c["body"],
            author_id=c["author_id"],
            author_name=c["author_name"],
            created_at=_blog_datetime_iso(c["created_at"]),
            updated_at=_blog_datetime_iso(c["updated_at"]),
            is_mine=(uid is not None and c["author_id"] == uid),
        )
        for c in crows
    ]
    return PostDetailOut(
        id=p["id"],
        content=p["content"],
        image=p["image"] or "",
        author_id=p["author_id"],
        author_name=p["author_name"],
        date=_blog_date(p["created_at"]),
        like_count=p["like_count"],
        liked_by_me=bool(p["liked_by_me"]),
        comments=comments,
    )


@app.post("/api/posts", response_model=PostListItem)
def create_post(body: PostCreate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    img = (body.image or "").strip()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO posts (author_id, content, image)
                VALUES (%s, %s, %s)
                RETURNING id, content, image, created_at, author_id
                """,
                (user_id, body.content.strip(), img),
            )
            row = cur.fetchone()
            cur.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
            an = cur.fetchone()
            cur.execute("SELECT avatar FROM profiles WHERE user_id = %s", (user_id,))
            prof_row = cur.fetchone()
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert row is not None and an is not None
    c = row["content"] or ""
    excerpt = c[:200] + ("..." if len(c) > 200 else "")
    avatar = (prof_row["avatar"] or "") if prof_row else ""
    return PostListItem(
        id=row["id"],
        excerpt=excerpt,
        author_id=row["author_id"],
        author_name=an["full_name"],
        author_avatar=avatar,
        date=_blog_date(row["created_at"]),
        like_count=0,
        comment_count=0,
        liked_by_me=False,
        has_image=bool((row["image"] or "").strip()),
    )


@app.put("/api/posts/{post_id}", response_model=PostDetailOut)
def update_post_row(post_id: int, body: PostUpdate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    img = (body.image or "").strip()
    with conn.cursor() as cur:
        cur.execute("SELECT author_id FROM posts WHERE id = %s", (post_id,))
        p = cur.fetchone()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    if p["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the author can edit this post")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE posts SET content = %s, image = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (body.content.strip(), img, post_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return get_one_post(post_id, user_id)


@app.delete("/api/posts/{post_id}")
def delete_post_row(post_id: int, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT author_id FROM posts WHERE id = %s", (post_id,))
        p = cur.fetchone()
    if not p:
        raise HTTPException(status_code=404, detail="Post not found")
    if p["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the author can delete this post")
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM posts WHERE id = %s", (post_id,))
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}


@app.post("/api/posts/{post_id}/like", response_model=LikeState)
def toggle_post_like(post_id: int, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM posts WHERE id = %s", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM post_likes WHERE post_id = %s AND user_id = %s",
                (post_id, user_id),
            )
            if cur.fetchone():
                cur.execute(
                    "DELETE FROM post_likes WHERE post_id = %s AND user_id = %s",
                    (post_id, user_id),
                )
                liked = False
            else:
                cur.execute(
                    "INSERT INTO post_likes (post_id, user_id) VALUES (%s, %s)",
                    (post_id, user_id),
                )
                liked = True
            cur.execute(
                "SELECT COUNT(*)::int AS like_count FROM post_likes WHERE post_id = %s",
                (post_id,),
            )
            cnt = cur.fetchone()["like_count"]
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return LikeState(liked=liked, like_count=cnt)


@app.post("/api/posts/{post_id}/comments", response_model=CommentOut)
def add_post_comment(post_id: int, body: CommentCreate, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM posts WHERE id = %s", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO post_comments (post_id, user_id, body)
                VALUES (%s, %s, %s)
                RETURNING id, body, created_at, updated_at
                """,
                (post_id, user_id, body.body.strip()),
            )
            row = cur.fetchone()
            cur.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
            an = cur.fetchone()
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert row is not None and an is not None
    return CommentOut(
        id=row["id"],
        body=row["body"],
        author_id=user_id,
        author_name=an["full_name"],
        created_at=_blog_datetime_iso(row["created_at"]),
        updated_at=_blog_datetime_iso(row["updated_at"]),
        is_mine=True,
    )


@app.patch("/api/posts/{post_id}/comments/{comment_id}", response_model=CommentOut)
def update_post_comment(
    post_id: int, comment_id: int, body: CommentUpdate, user_id: Annotated[int, Depends(get_current_user_id)]
):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT c.id, c.body, c.user_id, u.full_name AS author_name, c.created_at, c.updated_at
            FROM post_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = %s AND c.post_id = %s
            """,
            (comment_id, post_id),
        )
        c = cur.fetchone()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if c["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE post_comments SET body = %s, updated_at = NOW()
                WHERE id = %s AND post_id = %s
                RETURNING id, body, created_at, updated_at
                """,
                (body.body.strip(), comment_id, post_id),
            )
            row = cur.fetchone()
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    assert row is not None
    return CommentOut(
        id=row["id"],
        body=row["body"],
        author_id=user_id,
        author_name=c["author_name"],
        created_at=_blog_datetime_iso(row["created_at"]),
        updated_at=_blog_datetime_iso(row["updated_at"]),
        is_mine=True,
    )


@app.delete("/api/posts/{post_id}/comments/{comment_id}")
def delete_post_comment_row(post_id: int, comment_id: int, user_id: Annotated[int, Depends(get_current_user_id)]):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT user_id FROM post_comments WHERE id = %s AND post_id = %s",
            (comment_id, post_id),
        )
        c = cur.fetchone()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if c["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM post_comments WHERE id = %s AND post_id = %s",
                (comment_id, post_id),
            )
        conn.commit()
    except psycopg.Error:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Database error")
    return {"ok": True}
