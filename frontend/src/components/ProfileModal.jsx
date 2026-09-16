import { useState } from "react";
import { X, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { fileUrl } from "../api";

export default function ProfileModal({ onClose }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await api.put("/users/me", { name, about });
      setUser({ ...user, ...res.data.user });
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api.post("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUser({ ...user, avatar: res.data.avatar });
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl">
        <div className="bg-wa-teal text-white p-4 flex items-center justify-between rounded-t-lg">
          <h2 className="font-medium">Profile</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-wa-panel flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={fileUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl text-wa-time">
                    {user?.name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <label className="absolute bottom-1 right-1 bg-wa-green w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                <Camera size={18} className="text-white" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={uploadAvatar}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs">
                  Uploading...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-wa-green font-medium">Your name</label>
              <input
                className="w-full border-b-2 border-wa-green py-2 outline-none text-[15px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-wa-green font-medium">About</label>
              <input
                className="w-full border-b-2 border-wa-green py-2 outline-none text-[15px]"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-wa-time">Email</label>
              <p className="py-2 text-[15px] text-[#111b21]">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-wa-time hover:bg-wa-panel rounded"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={loading}
              className="px-4 py-2 text-sm bg-wa-green text-white rounded hover:bg-wa-darkGreen disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
