import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Homepage from "./pages/Homepage";
import CreateProfile from "./pages/CreateProfile";
import UserViewProfile from "./pages/UserViewProfile";
import PublicViewProfile from "./pages/PublicViewProfile";
import ReadBlog from "./pages/ReadBlog";
import WriteBlog from "./pages/WriteBlog";
import EditBlog from "./pages/EditBlog";
import EditPost from "./pages/EditPost";
import ReadSingleBlog from "./pages/ReadSingleBlog";
import Search from "./pages/Search";
import Filter from "./pages/Filter";
import CreatePost from "./pages/CreatePost";
import AllPosts from "./pages/AllPosts";
import ViewPost from "./pages/ViewPost";
import Settings from "./pages/Settings";
import AboutUs from "./pages/AboutUs";
import Faqs from "./pages/Faqs";

import Chatroom from "./pages/Chatroom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/homepage" element={<Homepage />} />
          <Route path="/createprofile" element={<CreateProfile />} />
          <Route path="/edit-profile" element={<CreateProfile />} />
          <Route path="/userviewprofile" element={<UserViewProfile />} />
          <Route path="/publicviewprofile" element={<PublicViewProfile />} />
          <Route path="/readblog" element={<ReadBlog />} />
          <Route path="/writeblog" element={<WriteBlog />} />
          <Route path="/edit_blog" element={<EditBlog />} />
          <Route path="/read_blog" element={<ReadSingleBlog />} />
          <Route path="/search" element={<Search />} />
          <Route path="/filter" element={<Filter />} />
          <Route path="/createpost" element={<CreatePost />} />
          <Route path="/all-posts" element={<AllPosts />} />
          <Route path="/viewpost" element={<ViewPost />} />
          <Route path="/editpost" element={<EditPost />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/faqs" element={<Faqs />} />
          <Route path="/chatroom" element={<Chatroom />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
