import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const TABS = {
  ALL_PHOTOS: "allPhotos",
  FOLDERS: "folders",
};

function normalizePhotos(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  function parseAttachmentString(raw) {
    if (typeof raw !== "string") {
      return null;
    }

    const idMatch = raw.match(/id=([^,\]\s]+)/);
    const typeMatch = raw.match(/type=([^,\]\s]+)/);
    const urlMatch = raw.match(/url=([^,\]\s]+)/);
    const previewMatch = raw.match(/preview_url=([^,\]\s]+)/);

    return {
      id: idMatch?.[1] || "",
      type: typeMatch?.[1] && typeMatch[1] !== "null" ? typeMatch[1] : null,
      url: urlMatch?.[1] && urlMatch[1] !== "null" ? urlMatch[1] : "",
      preview_url:
        previewMatch?.[1] && previewMatch[1] !== "null" ? previewMatch[1] : "",
    };
  }

  function toAttachment(attachment) {
    return typeof attachment === "string"
      ? parseAttachmentString(attachment)
      : attachment;
  }

  // Supports both direct photo arrays and Mastodon-style status arrays with media_attachments.
  return payload.flatMap((item) => {
    if (Array.isArray(item?.media_attachments)) {
      const createdAt = item.created_at || item.uploadedAt || "";
      const folder = item.folder || "Uncategorized";
      return item.media_attachments
        .map((attachment) => toAttachment(attachment))
        .filter(Boolean)
        .filter((attachment) => !attachment.type || attachment.type === "image")
        .map((attachment) => ({
          id: String(attachment.id || crypto.randomUUID()),
          url: attachment.preview_url || attachment.url || "",
          uploadedAt: createdAt,
          folder,
          size: attachment.size || item.size || "N/A",
        }))
        .filter((photo) => photo.url);
    }

    return [
      {
        id: String(item?.id || crypto.randomUUID()),
        url: item?.url || item?.preview_url || "",
        uploadedAt: item?.uploadedAt || item?.created_at || "",
        folder: item?.folder || "Uncategorized",
        size: item?.size || "N/A",
      },
    ].filter((photo) => photo.url);
  });
}

function DownloadButton({ url, className = "" }) {
  async function handleDownload(event) {
    event.stopPropagation();
    try {
      const response = await axios.get(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const fallbackLink = document.createElement("a");
      fallbackLink.href = url;
      fallbackLink.download = "";
      fallbackLink.target = "_blank";
      fallbackLink.rel = "noreferrer";
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      fallbackLink.remove();
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={`border-2 border-black bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white hover:text-black ${className}`}
    >
      Download
    </button>
  );
}

function ViewLoader() {
  return (
    <div className="flex min-h-[280px] items-center justify-center border-2 border-black bg-white">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="h-14 w-14 animate-spin"
          viewBox="0 0 80 80"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="8"
            y="8"
            width="64"
            height="64"
            stroke="black"
            strokeWidth="6"
          />
          <path d="M40 8 V40 H72" stroke="black" strokeWidth="6" />
        </svg>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#555555]">
          Loading
        </p>
      </div>
    </div>
  );
}

function ErrorAlert({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div role="alert" className="mb-6 border-2 border-black bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center border-2 border-black text-xs font-bold">
          !
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-black">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-[#555555]">{message}</p>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({ photo, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(photo)}
      className="group relative overflow-hidden border-2 border-black bg-white text-left transition"
    >
      <img
        src={photo.url}
        alt={`Photo ${photo.id}`}
        className="h-56 w-full object-cover sm:h-64"
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-black opacity-0 transition group-hover:opacity-30" />
      <DownloadButton
        url={photo.url}
        className="absolute bottom-4 right-4 opacity-0 transition group-hover:opacity-100"
      />
    </button>
  );
}

function PhotoGrid({ photos, emptyMessage, onPhotoClick }) {
  if (!photos.length) {
    return (
      <div className="border-2 border-black bg-white p-12 text-center text-[#555555]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} onClick={onPhotoClick} />
      ))}
    </section>
  );
}

function FolderCard({ name, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="border-2 border-black bg-white p-6 text-left transition hover:bg-black hover:text-white"
      type="button"
    >
      <div className="mb-4 h-12 w-12 rounded-full border-2 border-current" />
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-[#555555]">
        {count} photo{count !== 1 ? "s" : ""}
      </p>
      <div className="mt-4 border-t-2 border-current pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Rating: 5.0</span>
          <span>{count}+ sessions</span>
        </div>
      </div>
    </button>
  );
}

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS.ALL_PHOTOS);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);
  const transitionTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  function handleUploadClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    async function uploadSingleFile(file) {
      // const baseUrl = import.meta.env.VITE_API_URL;

      const attempts = [
        {
          url: `https://proaristocratic-surgeonless-miya.ngrok-free.dev/api/upload`,
          field: "file",
        },
        {
          url: `https://proaristocratic-surgeonless-miya.ngrok-free.dev/api/upload`,
          field: "files",
        },
        {
          url: `https://proaristocratic-surgeonless-miya.ngrok-free.dev/upload`,
          field: "file",
        },
        {
          url: `https://proaristocratic-surgeonless-miya.ngrok-free.dev/upload`,
          field: "files",
        },
      ];

      let lastError = null;
      for (const attempt of attempts) {
        try {
          const formData = new FormData();
          formData.append(attempt.field, file);
          // Let the browser/axios set multipart boundary automatically.
          await axios.post(attempt.url, formData);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError;
    }

    try {
      setViewLoading(true);
      setError("");

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (!imageFiles.length) {
        setError("Please select image files only.");
        return;
      }

      for (const file of imageFiles) {
        await uploadSingleFile(file);
      }

      const response = await axios.get(
        "https://proaristocratic-surgeonless-miya.ngrok-free.dev/statuses",
      );
      setPhotos(normalizePhotos(response.data));
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(backendMessage || "Upload failed. Please try again.");
    } finally {
      setViewLoading(false);
      event.target.value = "";
    }
  }

  function withViewTransition(updateFn) {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    setViewLoading(true);
    transitionTimeoutRef.current = setTimeout(() => {
      updateFn();
      setViewLoading(false);
    }, 300);
  }

  useEffect(() => {
    async function fetchPhotos() {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get("https://proaristocratic-surgeonless-miya.ngrok-free.dev/statuses");
        setPhotos(normalizePhotos(response.data));
      } catch (err) {
        setError("Could not load photos. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, []);

  const folderCounts = useMemo(() => {
    return photos.reduce((acc, photo) => {
      const folderName = photo.folder || "Uncategorized";
      acc[folderName] = (acc[folderName] || 0) + 1;
      return acc;
    }, {});
  }, [photos]);

  const filteredAllPhotos = useMemo(() => photos, [photos]);

  const filteredFolderPhotos = useMemo(() => {
    if (!selectedFolder) {
      return [];
    }

    return photos.filter(
      (photo) => (photo.folder || "Uncategorized") === selectedFolder,
    );
  }, [photos, selectedFolder]);

  const isBusy = loading || viewLoading;
  const currentVisiblePhotos =
    activeTab === TABS.FOLDERS && selectedFolder
      ? filteredFolderPhotos
      : filteredAllPhotos;
  const activePhotoIndex = activePhoto
    ? currentVisiblePhotos.findIndex((photo) => photo.id === activePhoto.id)
    : -1;

  function showPreviousPhoto() {
    if (activePhotoIndex <= 0) {
      return;
    }
    setActivePhoto(currentVisiblePhotos[activePhotoIndex - 1]);
  }

  function showNextPhoto() {
    if (
      activePhotoIndex < 0 ||
      activePhotoIndex >= currentVisiblePhotos.length - 1
    ) {
      return;
    }
    setActivePhoto(currentVisiblePhotos[activePhotoIndex + 1]);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-black">
      <header className="w-full border-b-2 border-black bg-[#f5f5f5]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <h1 className="text-4xl font-black tracking-tight">CloudIt</h1>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleUploadClick}
              className="border-2 border-black bg-black px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white"
            >
              Upload
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14">
        <section className="border-2 border-black bg-white p-6 sm:p-8">
          <div className="mb-8 flex justify-center">
            <nav className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  withViewTransition(() => {
                    setActiveTab(TABS.ALL_PHOTOS);
                    setSelectedFolder(null);
                  });
                }}
                className={`border-2 border-black px-5 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                  activeTab === TABS.ALL_PHOTOS
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                All Photos
              </button>
              <button
                type="button"
                onClick={() => {
                  withViewTransition(() => {
                    setActiveTab(TABS.FOLDERS);
                  });
                }}
                className={`border-2 border-black px-5 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                  activeTab === TABS.FOLDERS
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                Folders
              </button>
            </nav>
          </div>

          <ErrorAlert message={error} />
          {isBusy ? <ViewLoader /> : null}

          {!isBusy && !error && activeTab === TABS.ALL_PHOTOS ? (
            <PhotoGrid
              photos={filteredAllPhotos}
              emptyMessage="No photos found."
              onPhotoClick={setActivePhoto}
            />
          ) : null}

          {!isBusy && !error && activeTab === TABS.FOLDERS ? (
            <div className="space-y-6">
              {selectedFolder ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">
                    Folder: {selectedFolder}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      withViewTransition(() => {
                        setSelectedFolder(null);
                      });
                    }}
                    className="border-2 border-black bg-black px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white"
                  >
                    Back to Folders
                  </button>
                </div>
              ) : (
                <h2 className="text-4xl font-semibold">Featured Collections</h2>
              )}

              {selectedFolder ? (
                <PhotoGrid
                  photos={filteredFolderPhotos}
                  emptyMessage="No photos found in this folder."
                  onPhotoClick={setActivePhoto}
                />
              ) : (
                <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(folderCounts).map(([name, count]) => (
                    <FolderCard
                      key={name}
                      name={name}
                      count={count}
                      onClick={() => {
                        withViewTransition(() => {
                          setSelectedFolder(name);
                        });
                      }}
                    />
                  ))}
                </section>
              )}
            </div>
          ) : null}
        </section>
      </main>

      {activePhoto ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActivePhoto(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setActivePhoto(null);
            }
            if (event.key === "ArrowLeft") {
              showPreviousPhoto();
            }
            if (event.key === "ArrowRight") {
              showNextPhoto();
            }
          }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-8"
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden border-2 border-black bg-white p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={showPreviousPhoto}
              disabled={activePhotoIndex <= 0}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 border-2 border-black bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            <button
              type="button"
              onClick={showNextPhoto}
              disabled={activePhotoIndex >= currentVisiblePhotos.length - 1}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 border-2 border-black bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>

            <img
              src={activePhoto.url}
              alt={`Photo ${activePhoto.id}`}
              className="max-h-[78vh] w-full object-contain"
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
              <DownloadButton url={activePhoto.url} />
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="border-2 border-black bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// This file is intentionally verbose and not split into multiple components/files to make it easier to read and understand in one go. In a production app, you would likely want to break this up into smaller components and organize it across multiple files.
