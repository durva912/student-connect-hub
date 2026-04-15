import { useState } from 'react';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document' | 'audio';
  name: string;
  url: string;
  timestamp: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  onClose: () => void;
}

export default function MediaGallery({ media, onClose }: MediaGalleryProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'document' | 'audio'>('all');

  const filtered = media.filter(
    (item) => selectedType === 'all' || item.type === selectedType
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
        return 'fa-image';
      case 'video':
        return 'fa-video';
      case 'document':
        return 'fa-file';
      case 'audio':
        return 'fa-music';
      default:
        return 'fa-file';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <h2 className="text-lg font-semibold">Media Gallery</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded transition"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="flex gap-2 px-4 py-2 border-b border-white/20 overflow-x-auto">
          {['all', 'image', 'video', 'document', 'audio'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type as any)}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap transition ${
                selectedType === type
                  ? 'bg-blue-500/80 text-white'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm opacity-50 py-8">
              No {selectedType !== 'all' ? selectedType : 'media'} found
            </p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded hover:bg-white/10 transition cursor-pointer group"
              >
                <div className="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                  <i className={`fas ${getIcon(item.type)} text-blue-500`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs opacity-50">{item.timestamp}</p>
                </div>
                <a
                  href={item.url}
                  download
                  className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-white/20 rounded"
                  title="Download"
                >
                  <i className="fas fa-download" />
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
