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
      const folder = item.folder || "";
      return item.media_attachments
        .map((attachment) => toAttachment(attachment))
        .filter(Boolean)
        .filter((attachment) => !attachment.type || attachment.type === "image")
        .map((attachment, index) => ({
          id: String(item.id ? `${item.id}-${index}` : crypto.randomUUID()),
          statusId: String(item.id || attachment.id || ""),
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
        statusId: String(item?.id || ""),
        url: item?.url || item?.preview_url || "",
        uploadedAt: item?.uploadedAt || item?.created_at || "",
        folder: item?.folder || "",
        size: item?.size || "N/A",
      },
    ].filter((photo) => photo.url);
  });
}

function DownloadButton({ url, className = "", isDarkMode = false }) {
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
      className={`border-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
        isDarkMode
          ? "border-[#cfcfcf] bg-[#cfcfcf] text-[#2a2a2a] hover:bg-transparent hover:text-[#e9e9e9]"
          : "border-black bg-black text-white hover:bg-white hover:text-black"
      } ${className}`}
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

function SuccessAlert({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-6 border-2 border-green-700 bg-green-50 px-4 py-3 text-green-900"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-green-700 text-xs font-bold">
          ✓
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">
            Uploaded successfully
          </p>
          <p className="mt-1 text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

function MoonIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 1 0 10.5 10.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 2.5V5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhotoActionButton({
  children,
  onClick,
  className = "",
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`border-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${className}`}
    >
      {children}
    </button>
  );
}

function PhotoCard({ photo, onClick, onDelete, isDarkMode }) {
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
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
        <DownloadButton url={photo.url} isDarkMode={isDarkMode} />
        <PhotoActionButton
          onClick={(event) => {
            event.stopPropagation();
            onDelete(photo);
          }}
          className={
            isDarkMode
              ? "border-red-300 bg-red-300 text-[#2a2a2a] hover:bg-transparent hover:text-red-200"
              : "border-red-700 bg-red-700 text-white hover:bg-white hover:text-red-700"
          }
        >
          Delete
        </PhotoActionButton>
      </div>
    </button>
  );
}

function PhotoGrid({ photos, emptyMessage, onPhotoClick, onDeletePhoto, isDarkMode }) {
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
        <PhotoCard
          key={photo.id}
          photo={photo}
          onClick={onPhotoClick}
          onDelete={onDeletePhoto}
          isDarkMode={isDarkMode}
        />
      ))}
    </section>
  );
}

function FolderCard({ name, count, onClick, isDarkMode }) {
  return (
    <button
      onClick={onClick}
      className={`border-2 p-6 text-left transition ${
        isDarkMode
          ? "border-[#cfcfcf] bg-[#333333] text-[#f2f2f2] hover:bg-[#454545]"
          : "border-black bg-white text-black hover:bg-black hover:text-white"
      }`}
      type="button"
    >
      <div className="mb-4 h-12 w-12 rounded-full border-2 border-current" />
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className={`mt-1 text-sm ${isDarkMode ? "text-[#d8d8d8]" : "text-[#555555]"}`}>
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
  const [folders, setFolders] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS.ALL_PHOTOS);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFolderPhotos, setSelectedFolderPhotos] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState("");
  const transitionTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);
  const popStateRef = useRef(false);
  const fileInputRef = useRef(null);
  const folderFileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  function showUploadSuccess(message) {
    setSuccessMessage(message);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  function handleUploadClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function uploadFiles(files, endpoint) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setError("Please select image files only.");
      return;
    }

    for (const file of imageFiles) {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(endpoint, formData);
    }
  }

  async function fetchAllPhotos() {
    const response = await axios.get("/statuses");
    const normalized = normalizePhotos(response.data);
    setPhotos(normalized);
  }

  async function fetchFolders() {
    const response = await axios.get("/folder");
    const folderNames = Array.isArray(response.data)
      ? response.data
          .map((item) => item?.folderName)
          .filter((folderName) => typeof folderName === "string")
      : [];
    setFolders(Array.from(new Set(folderNames)));
  }

  async function fetchFolderPhotos(folderName) {
    const encodedFolder = encodeURIComponent(folderName);
    try {
      const response = await axios.get(`/statuses/${encodedFolder}`);
      const normalized = normalizePhotos(response.data).map((photo) => ({
        ...photo,
        folder: photo.folder || folderName,
      }));
      setSelectedFolderPhotos(normalized);
    } catch (err) {
      if (err?.response?.status === 404) {
        setSelectedFolderPhotos([]);
        return;
      }
      throw err;
    }
  }

  async function handleDeletePhoto(photo) {
    const statusId = photo?.statusId;
    if (!statusId) {
      setError("Could not delete this image because id is missing.");
      return;
    }

    try {
      setViewLoading(true);
      setError("");
      setSuccessMessage("");
      setDeletingPhotoId(photo.id);
      await axios.delete(`/delete/${encodeURIComponent(statusId)}`);
      setActivePhoto(null);
      await Promise.all([
        fetchAllPhotos(),
        fetchFolders(),
        selectedFolder ? fetchFolderPhotos(selectedFolder) : Promise.resolve(),
      ]);
      showUploadSuccess("Image deleted successfully.");
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(backendMessage || "Delete failed. Please try again.");
    } finally {
      setDeletingPhotoId("");
      setViewLoading(false);
    }
  }

  async function handleFileChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    try {
      setViewLoading(true);
      setError("");
      setSuccessMessage("");
      await uploadFiles(files, "/api/upload");
      await Promise.all([fetchAllPhotos(), fetchFolders()]);
      showUploadSuccess("Your photos were uploaded.");
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(backendMessage || "Upload failed. Please try again.");
    } finally {
      setViewLoading(false);
      event.target.value = "";
    }
  }

  function handleFolderUploadClick() {
    if (folderFileInputRef.current) {
      folderFileInputRef.current.click();
    }
  }

  async function handleFolderFileChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !selectedFolder) {
      return;
    }

    try {
      setViewLoading(true);
      setError("");
      setSuccessMessage("");
      const encodedFolder = encodeURIComponent(selectedFolder);
      await uploadFiles(files, `/api/upload/${encodedFolder}`);
      await Promise.all([
        fetchAllPhotos(),
        fetchFolderPhotos(selectedFolder),
        fetchFolders(),
      ]);
      showUploadSuccess(`Uploaded to folder "${selectedFolder}".`);
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(backendMessage || "Upload failed. Please try again.");
    } finally {
      setViewLoading(false);
      event.target.value = "";
    }
  }

  function handleCreateFolder() {
    const folderName = window.prompt("Enter new folder name:");
    const trimmedName = folderName?.trim();

    if (!trimmedName) {
      return;
    }

    setFolders((previous) => {
      if (previous.includes(trimmedName)) {
        return previous;
      }
      return [...previous, trimmedName];
    });
  }

  async function handleFoldersTabClick() {
    try {
      setViewLoading(true);
      setError("");
      setActiveTab(TABS.FOLDERS);
      setSelectedFolder(null);
      await fetchFolders();
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(backendMessage || "Could not load folders. Please try again.");
    } finally {
      setViewLoading(false);
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
        const response = await axios.get("http://localhost:8080/statuses");
        setPhotos(normalizePhotos(response.data));
      } catch (err) {
        setError("Could not load photos. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchPhotos();
  }, []);

  useEffect(() => {
    window.history.replaceState(
      { tab: TABS.ALL_PHOTOS, folder: null },
      "",
    );
  }, []);

  useEffect(() => {
    function handlePopState(event) {
      const state = event.state || {};
      const nextTab = state.tab || TABS.ALL_PHOTOS;
      const nextFolder = state.folder || null;

      popStateRef.current = true;
      setActiveTab(nextTab);
      setSelectedFolder(nextFolder);
      setActivePhoto(null);

      async function syncFromHistory() {
        try {
          if (nextTab === TABS.FOLDERS) {
            await fetchFolders();
            if (nextFolder) {
              await fetchFolderPhotos(nextFolder);
            } else {
              setSelectedFolderPhotos([]);
            }
          }
        } finally {
          popStateRef.current = false;
        }
      }

      syncFromHistory();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (popStateRef.current) {
      return;
    }
    const currentState = window.history.state || {};
    const nextState = {
      tab: activeTab,
      folder: selectedFolder || null,
    };

    if (
      currentState.tab === nextState.tab &&
      currentState.folder === nextState.folder
    ) {
      return;
    }

    window.history.pushState(nextState, "");
  }, [activeTab, selectedFolder]);

  const folderCounts = useMemo(() => {
    const counts = photos.reduce((acc, photo) => {
      const folderName = typeof photo.folder === "string" ? photo.folder.trim() : "";
      if (!folderName) {
        return acc;
      }
      acc[folderName] = (acc[folderName] || 0) + 1;
      return acc;
    }, {});
    folders.forEach((folderName) => {
      if (!(folderName in counts)) {
        counts[folderName] = 0;
      }
    });
    return counts;
  }, [photos, folders]);

  const filteredAllPhotos = useMemo(() => photos, [photos]);

  const filteredFolderPhotos = useMemo(() => {
    if (!selectedFolder) {
      return [];
    }

    return selectedFolderPhotos;
  }, [selectedFolder, selectedFolderPhotos]);

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
    <div
      className={`min-h-screen transition-colors ${
        isDarkMode ? "bg-[#2b2b2b] text-[#f2f2f2]" : "bg-[#f5f5f5] text-black"
      }`}
    >
      <header
        className={`w-full border-b-2 transition-colors ${
          isDarkMode
            ? "border-[#cfcfcf] bg-[#2b2b2b]"
            : "border-black bg-[#f5f5f5]"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <h1 className="text-4xl font-black tracking-tight">CloudIt</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode((previous) => !previous)}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className={`rounded-full border-2 p-2 transition ${
                isDarkMode
                  ? "border-[#d9d9d9] text-[#ffd86f] hover:bg-[#3b3b3b]"
                  : "border-black text-black hover:bg-[#ececec]"
              }`}
            >
              {isDarkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
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
              className={`border-2 px-6 py-3 text-sm font-semibold uppercase tracking-wide ${
                isDarkMode
                  ? "border-[#d0d0d0] bg-[#d0d0d0] text-[#2b2b2b] hover:bg-transparent hover:text-[#f2f2f2]"
                  : "border-black bg-black text-white"
              }`}
            >
              Upload
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14">
        <section
          className={`border-2 p-6 transition-colors sm:p-8 ${
            isDarkMode ? "border-[#cfcfcf] bg-[#303030]" : "border-black bg-white"
          }`}
        >
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
                    ? isDarkMode
                      ? "border-[#d6d6d6] bg-[#d6d6d6] text-[#2b2b2b]"
                      : "bg-black text-white"
                    : isDarkMode
                      ? "border-[#d6d6d6] bg-[#3d3d3d] text-[#f2f2f2]"
                      : "bg-white text-black"
                }`}
              >
                All Photos
              </button>
              <button
                type="button"
                onClick={() => {
                  handleFoldersTabClick();
                }}
                className={`border-2 border-black px-5 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                  activeTab === TABS.FOLDERS
                    ? isDarkMode
                      ? "border-[#d6d6d6] bg-[#d6d6d6] text-[#2b2b2b]"
                      : "bg-black text-white"
                    : isDarkMode
                      ? "border-[#d6d6d6] bg-[#3d3d3d] text-[#f2f2f2]"
                      : "bg-white text-black"
                }`}
              >
                Folders
              </button>
            </nav>
          </div>

          <ErrorAlert message={error} />
          <SuccessAlert message={successMessage} />
          {isBusy ? <ViewLoader /> : null}

          {!isBusy && !error && activeTab === TABS.ALL_PHOTOS ? (
            <PhotoGrid
              photos={filteredAllPhotos}
              emptyMessage="No photos found."
              onPhotoClick={setActivePhoto}
              onDeletePhoto={handleDeletePhoto}
              isDarkMode={isDarkMode}
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
                    className={`border-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                      isDarkMode
                        ? "border-[#d0d0d0] bg-[#d0d0d0] text-[#2b2b2b] hover:bg-transparent hover:text-[#f2f2f2]"
                        : "border-black bg-black text-white"
                    }`}
                  >
                    Back to Folders
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-4xl font-semibold">Featured Collections</h2>
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    className={`border-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                      isDarkMode
                        ? "border-[#d0d0d0] bg-[#d0d0d0] text-[#2b2b2b] hover:bg-transparent hover:text-[#f2f2f2]"
                        : "border-black bg-black text-white"
                    }`}
                  >
                    New Folder
                  </button>
                </div>
              )}

              {selectedFolder ? (
                <div className="space-y-4">
                  <div>
                    <input
                      ref={folderFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFolderFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={handleFolderUploadClick}
                      className={`border-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                        isDarkMode
                          ? "border-[#d0d0d0] bg-[#d0d0d0] text-[#2b2b2b] hover:bg-transparent hover:text-[#f2f2f2]"
                          : "border-black bg-black text-white"
                      }`}
                    >
                      Upload To Folder
                    </button>
                  </div>
                  <PhotoGrid
                    photos={filteredFolderPhotos}
                    emptyMessage="No photos found in this folder."
                    onPhotoClick={setActivePhoto}
                    onDeletePhoto={handleDeletePhoto}
                    isDarkMode={isDarkMode}
                  />
                </div>
              ) : (
                <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(folderCounts).map(([name, count]) => (
                    <FolderCard
                      key={name}
                      name={name}
                      count={count}
                      isDarkMode={isDarkMode}
                      onClick={async () => {
                        try {
                          setViewLoading(true);
                          setError("");
                          await fetchFolderPhotos(name);
                          setSelectedFolder(name);
                        } catch (err) {
                          const backendMessage =
                            err?.response?.data?.message ||
                            err?.response?.data?.error;
                          setError(
                            backendMessage ||
                              "Could not load this folder. Please try again.",
                          );
                        } finally {
                          setViewLoading(false);
                        }
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 py-8"
        >
          <div
            className={`relative w-full max-w-4xl overflow-hidden border-2 p-3 ${
              isDarkMode
                ? "border-[#cfcfcf] bg-[#343434]"
                : "border-black bg-white"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={showPreviousPhoto}
              disabled={activePhotoIndex <= 0}
              className={`absolute left-4 top-1/2 z-10 -translate-y-1/2 border-2 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                isDarkMode
                  ? "border-[#d0d0d0] bg-[#4a4a4a] text-[#f2f2f2]"
                  : "border-black bg-white"
              }`}
            >
              Prev
            </button>

            <button
              type="button"
              onClick={showNextPhoto}
              disabled={activePhotoIndex >= currentVisiblePhotos.length - 1}
              className={`absolute right-4 top-1/2 z-10 -translate-y-1/2 border-2 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                isDarkMode
                  ? "border-[#d0d0d0] bg-[#4a4a4a] text-[#f2f2f2]"
                  : "border-black bg-white"
              }`}
            >
              Next
            </button>

            <img
              src={activePhoto.url}
              alt={`Photo ${activePhoto.id}`}
              className="max-h-[78vh] w-full object-contain"
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-3">
              <DownloadButton url={activePhoto.url} isDarkMode={isDarkMode} />
              <PhotoActionButton
                onClick={() => handleDeletePhoto(activePhoto)}
                className={
                  isDarkMode
                    ? "border-red-300 bg-red-300 text-[#2a2a2a] hover:bg-transparent hover:text-red-200"
                    : "border-red-700 bg-red-700 text-white hover:bg-white hover:text-red-700"
                }
              >
                {deletingPhotoId === activePhoto.id ? "Deleting..." : "Delete"}
              </PhotoActionButton>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className={`border-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                  isDarkMode
                    ? "border-[#d0d0d0] bg-[#4a4a4a] text-[#f2f2f2]"
                    : "border-black bg-white text-black"
                }`}
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
