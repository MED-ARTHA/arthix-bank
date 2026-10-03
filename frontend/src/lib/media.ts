const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export type UploadedMedia = { id: string; type: "image" | "video"; url: string };

/** Media URLs from the API are relative (/api/media/<id>); this makes them loadable by <img> and <video>. */
export const mediaSrc = (url?: string | null) => (!url ? "" : /^https?:/.test(url) ? url : `${API}${url}`);

const LIMIT_MB = { image: 10, video: 25, avatar: 5 };

export function uploadMedia(
  file: File,
  purpose: "chat" | "avatar",
  onProgress?: (p: number) => void
): Promise<UploadedMedia> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return Promise.reject(new Error("Only images and videos are supported."));
  if (purpose === "avatar" && !isImage) return Promise.reject(new Error("Please choose an image."));
  const max = purpose === "avatar" ? LIMIT_MB.avatar : isImage ? LIMIT_MB.image : LIMIT_MB.video;
  if (file.size > max * 1024 * 1024) return Promise.reject(new Error(`File is too large (max ${max} MB).`));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/api/media`);
    const token = localStorage.getItem("token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onload = () => {
      if (xhr.status === 401) return reject(new Error("Session expired, please sign in again."));
      let body: { message?: string; id?: string; type?: "image" | "video"; url?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.id && body.type && body.url) {
        resolve({ id: body.id, type: body.type, url: body.url });
      } else {
        reject(new Error(body.message || (xhr.status === 413 ? "File is too large." : "Upload failed.")));
      }
    };

    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    xhr.send(form);
  });
}