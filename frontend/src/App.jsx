import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = "https://streamvault-lmsr.onrender.com/api/videos";
const AUTH_URL = "https://streamvault-lmsr.onrender.com/api/auth";
const USER_AUTH_URL = "https://streamvault-lmsr.onrender.com/api/user-auth";
const PROGRESS_URL = "https://streamvault-lmsr.onrender.com/api/progress";
const CLOUDINARY_SIGNATURE_URL =
  "https://streamvault-lmsr.onrender.com/api/cloudinary/signature";

const emptyForm = {
  title: "",
  category: "Sci-Fi",
  type: "Movie",
  description: "",
};

const emptyUpload = {
  title: "",
  category: "Sci-Fi",
  type: "Movie",
  description: "",
};

function getGeneratedVideoThumbnail(video) {
  if (!video?.videoUrl) return "";
  const url = video.videoUrl;

  if (
    url.includes("res.cloudinary.com/") &&
    url.includes("/video/upload/")
  ) {
    return url
      .replace("/video/upload/", "/video/upload/so_0/")
      .replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, ".jpg");
  }

  return "";
}

function getVideoThumbnail(video) {
  return video?.thumbnailUrl || getGeneratedVideoThumbnail(video);
}

function handleThumbnailError(video, event) {
  const fallback = getGeneratedVideoThumbnail(video);

  if (
    fallback &&
    !event.currentTarget.dataset.fallbackAttempted
  ) {
    event.currentTarget.dataset.fallbackAttempted = "true";
    event.currentTarget.src = fallback;
    return;
  }

  event.currentTarget.style.display = "none";
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const isAdminRoute = currentPath === "/admin";
  const isLoginRoute = currentPath === "/login";
  const isWatchRoute = currentPath.startsWith("/watch/");
  const watchId = isWatchRoute
    ? decodeURIComponent(currentPath.slice("/watch/".length))
    : "";

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const watchVideo = videos.find(
    (video) => String(video.id) === watchId
  );

  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [isUser, setIsUser] = useState(false);
  const [userSessionChecked, setUserSessionChecked] = useState(false);
  const [signedInUserEmail, setSignedInUserEmail] = useState("");
  const [userEmailInput, setUserEmailInput] = useState("");
  const [userPhoneInput, setUserPhoneInput] = useState("");
  const [userOtp, setUserOtp] = useState("");
  const [userOtpRequested, setUserOtpRequested] = useState(false);
  const [userAuthBusy, setUserAuthBusy] = useState(false);
  const [userAuthMessage, setUserAuthMessage] = useState("");
  const [playbackMessage, setPlaybackMessage] = useState("");

  const videoRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  const [uploadData, setUploadData] = useState(emptyUpload);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  async function fetchVideos() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Video API error:", err);
      setError("Could not load StreamVault videos. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }

  async function getCsrfToken() {
    const response = await fetch(`${AUTH_URL}/csrf`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(
        `Could not initialize security: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error("The backend did not return a CSRF token.");
    }

    return data.token;
  }

  async function checkAdminSession() {
    try {
      const response = await fetch(`${AUTH_URL}/status`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Session check failed: HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setIsAdmin(data.isAdmin === true);
    } catch (err) {
      console.error("Admin session check failed:", err);
      setIsAdmin(false);
    } finally {
      setSessionChecked(true);
    }
  }

  async function checkUserSession() {
    try {
      const response = await fetch(`${USER_AUTH_URL}/status`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Session check failed: HTTP ${response.status}`
        );
      }

      const data = await response.json();
      setIsUser(data.isUser === true);
      setSignedInUserEmail(data.email || "");
    } catch (err) {
      console.error("User session check failed:", err);
      setIsUser(false);
      setSignedInUserEmail("");
    } finally {
      setUserSessionChecked(true);
    }
  }

  async function handleRequestUserOtp(event) {
    event.preventDefault();
    setUserAuthBusy(true);
    setUserAuthMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `${USER_AUTH_URL}/request-email-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
          },
          body: JSON.stringify({
            email: userEmailInput.trim().toLowerCase(),
            phoneNumber: userPhoneInput.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `OTP request failed: HTTP ${response.status}`
        );
      }

      setUserOtpRequested(true);
      setUserAuthMessage(
        data.message || "Check your email for your six-digit code."
      );
    } catch (err) {
      console.error("User OTP request error:", err);
      setUserAuthMessage(
        err.message || "Could not request a sign-in code."
      );
    } finally {
      setUserAuthBusy(false);
    }
  }

  async function handleVerifyUserOtp(event) {
    event.preventDefault();
    setUserAuthBusy(true);
    setUserAuthMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `${USER_AUTH_URL}/verify-email-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
          },
          body: JSON.stringify({
            email: userEmailInput.trim().toLowerCase(),
            phoneNumber: userPhoneInput.trim(),
            otp: userOtp.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Verification failed: HTTP ${response.status}`
        );
      }

      setUserOtp("");
      setUserOtpRequested(false);
      setIsAdmin(false);
      setSignedInUserEmail(userEmailInput.trim().toLowerCase());
      setUserAuthMessage("Sign-in successful.");

      await checkUserSession();

      const query = new URLSearchParams(location.search);
      const destination = query.get("returnTo") || "/";

      navigate(
        destination.startsWith("/") && !destination.startsWith("//")
          ? destination
          : "/"
      );
    } catch (err) {
      console.error("User OTP verification error:", err);
      setUserAuthMessage(
        err.message || "Could not verify the code."
      );
    } finally {
      setUserAuthBusy(false);
    }
  }

  async function handleUserLogout() {
    setUserAuthBusy(true);
    setUserAuthMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${USER_AUTH_URL}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-XSRF-TOKEN": csrfToken },
      });

      if (!response.ok) {
        throw new Error(`Logout failed: HTTP ${response.status}`);
      }

      setIsUser(false);
      setSignedInUserEmail("");
      setUserAuthMessage("You have logged out.");
      navigate("/");
    } catch (err) {
      console.error("User logout error:", err);
      setUserAuthMessage(err.message || "Could not log out.");
    } finally {
      setUserAuthBusy(false);
    }
  }

  async function handleVideoMetadataLoaded() {
    const player = videoRef.current;

    if (!player || !watchVideo || !isUser) return;

    try {
      const response = await fetch(
        `${PROGRESS_URL}/${encodeURIComponent(watchVideo.id)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const savedSeconds = Number(data.positionSeconds || 0);
      const duration = Number(player.duration || 0);

      if (data.completed === true) {
        setPlaybackMessage(
          "You've finished this video. You can replay it from the beginning."
        );
        lastSavedTimeRef.current = 0;
        return;
      }

      if (
        savedSeconds > 5 &&
        (!duration || savedSeconds < duration - 5)
      ) {
        player.currentTime = savedSeconds;
        lastSavedTimeRef.current = savedSeconds;

        const minutes = Math.floor(savedSeconds / 60);
        const seconds = Math.floor(savedSeconds % 60)
          .toString()
          .padStart(2, "0");

        setPlaybackMessage(`Resuming from ${minutes}:${seconds}.`);
      }
    } catch (err) {
      console.warn("Could not load playback progress:", err);
    }
  }

  async function savePlaybackProgress(force = false) {
    const player = videoRef.current;

    if (
      !isUser ||
      !watchVideo ||
      !player ||
      !Number.isFinite(player.duration) ||
      player.duration <= 0
    ) {
      return;
    }

    const position = Math.max(0, Math.floor(player.currentTime || 0));

    if (position <= 0) return;

    if (
      !force &&
      Math.abs(position - lastSavedTimeRef.current) < 10
    ) {
      return;
    }

    lastSavedTimeRef.current = position;

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `${PROGRESS_URL}/${encodeURIComponent(watchVideo.id)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
          },
          body: JSON.stringify({
            positionSeconds: position,
            durationSeconds: Math.floor(player.duration),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Progress save failed: HTTP ${response.status}`
        );
      }
    } catch (err) {
      console.warn("Could not save playback progress:", err);
    }
  }

  useEffect(() => {
    fetchVideos();
    checkAdminSession();
    checkUserSession();
  }, []);

  useEffect(() => {
    lastSavedTimeRef.current = 0;
    setPlaybackMessage("");
  }, [watchVideo?.id]);

  async function handleRequestOtp(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${AUTH_URL}/request-email-otp`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({ email: adminEmail.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Request failed: HTTP ${response.status}`
        );
      }

      setOtpRequested(true);
      setAuthMessage(
        data.message || "Check your email for the verification code."
      );
    } catch (err) {
      console.error("OTP request error:", err);
      setAuthMessage(err.message || "Could not request an OTP.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${AUTH_URL}/verify-email-otp`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({
          email: adminEmail.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Verification failed: HTTP ${response.status}`
        );
      }

      setOtp("");
      setOtpRequested(false);
      setIsUser(false);
      setSignedInUserEmail("");
      setAuthMessage("Admin login successful.");

      await checkAdminSession();
      await fetchVideos();
    } catch (err) {
      console.error("OTP verification error:", err);
      setAuthMessage(err.message || "Could not verify the code.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`${AUTH_URL}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-XSRF-TOKEN": csrfToken },
      });

      if (!response.ok) {
        throw new Error(`Logout failed: HTTP ${response.status}`);
      }

      setIsAdmin(false);
      setIsUser(false);
      setSignedInUserEmail("");
      setOtp("");
      setOtpRequested(false);
      setFormMessage("");
      setUploadMessage("");
      setAuthMessage("You have logged out.");
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      setAuthMessage(err.message || "Could not log out.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleAddVideo(event) {
    event.preventDefault();
    setSaving(true);
    setFormMessage("");

    try {
      if (!isAdmin) {
        throw new Error("Please sign in as admin first.");
      }

      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API_URL}/demo`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(
          (await response.text()) || `HTTP ${response.status}`
        );
      }

      setFormData({ ...emptyForm });
      setFormMessage("Video metadata added successfully.");
      await fetchVideos();
    } catch (err) {
      console.error("Add video error:", err);
      setFormMessage(`Could not add video: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteVideo(video) {
    if (!isAdmin) {
      setFormMessage("Admin access is required.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${video.title}" from your library?`
    );

    if (!confirmed) return;

    setFormMessage("");

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(video.id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-XSRF-TOKEN": csrfToken },
        }
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) || `HTTP ${response.status}`
        );
      }

      setFormMessage(`Deleted "${video.title}" successfully.`);
      await fetchVideos();
    } catch (err) {
      console.error("Delete video error:", err);
      setFormMessage(`Could not delete video: ${err.message}`);
    }
  }

  function updateUploadField(field, value) {
    setUploadData((current) => ({ ...current, [field]: value }));
  }

  async function uploadToCloudinary(file, resourceType = "video") {
    if (!file) {
      throw new Error("Choose a file first.");
    }

    const signatureResponse = await fetch(CLOUDINARY_SIGNATURE_URL, {
      method: "GET",
      credentials: "include",
    });

    const signatureData = await signatureResponse
      .json()
      .catch(() => ({}));

    if (!signatureResponse.ok) {
      throw new Error(
        signatureData.message ||
          signatureData.error ||
          `Could not get Cloudinary signature: HTTP ${signatureResponse.status}`
      );
    }

    const { signature, timestamp, apiKey, cloudName, folder } =
      signatureData;

    if (!signature || !timestamp || !apiKey || !cloudName) {
      throw new Error(
        "The signature response must include signature, timestamp, apiKey and cloudName. Check your backend response format."
      );
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("signature", signature);

    if (folder) uploadForm.append("folder", folder);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/${resourceType}/upload`,
      {
        method: "POST",
        body: uploadForm,
      }
    );

    const uploadResult = await uploadResponse
      .json()
      .catch(() => ({}));

    if (!uploadResponse.ok) {
      throw new Error(
        uploadResult.error?.message ||
          `Cloudinary upload failed: HTTP ${uploadResponse.status}`
      );
    }

    return uploadResult;
  }

  async function handleUploadVideo(event) {
    event.preventDefault();
    setUploadMessage("");
    setUploadProgress("");

    if (!isAdmin) {
      setUploadMessage("Please sign in as admin first.");
      return;
    }

    if (!videoFile) {
      setUploadMessage("Select an MP4 file.");
      return;
    }

    if (
      videoFile.type !== "video/mp4" &&
      !videoFile.name.toLowerCase().endsWith(".mp4")
    ) {
      setUploadMessage("Only MP4 files are accepted.");
      return;
    }

    if (!uploadData.title.trim()) {
      setUploadMessage("Enter a title for the video.");
      return;
    }

    setUploading(true);

    try {
      setUploadProgress("Uploading video to Cloudinary…");

      const videoResult = await uploadToCloudinary(videoFile, "video");
      let thumbnailResult = null;

      if (thumbnailFile) {
        setUploadProgress("Uploading thumbnail…");
        thumbnailResult = await uploadToCloudinary(
          thumbnailFile,
          "image"
        );
      }

      setUploadProgress("Saving video details…");

      const csrfToken = await getCsrfToken();

      const metadata = {
        title: uploadData.title.trim(),
        category: uploadData.category.trim(),
        type: uploadData.type,
        description: uploadData.description.trim(),
        videoUrl: videoResult.secure_url,
        publicId: videoResult.public_id,
        thumbnailUrl: thumbnailResult?.secure_url || "",
        published: true,
      };

      const response = await fetch(`${API_URL}/upload-metadata`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify(metadata),
      });

      const savedData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          savedData.message ||
            savedData.error ||
            "Media uploaded, but the backend could not save its metadata. Check VideoController and Video.java."
        );
      }

      setUploadData({ ...emptyUpload });
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress("");
      setUploadMessage(
        "Upload complete. Check that the video is published and playable."
      );

      const videoInput = document.getElementById("mp4-file");
      const thumbnailInput = document.getElementById("thumbnail-file");

      if (videoInput) videoInput.value = "";
      if (thumbnailInput) thumbnailInput.value = "";

      await fetchVideos();
    } catch (err) {
      console.error("Video upload error:", err);
      setUploadProgress("");
      setUploadMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  const categories = useMemo(
    () => [
      "All",
      ...new Set(videos.map((video) => video.category).filter(Boolean)),
    ],
    [videos]
  );

  const filteredVideos = useMemo(() => {
    const query = search.toLowerCase().trim();

    return videos.filter((video) => {
      const matchesSearch = [
        video.title,
        video.description,
        video.category,
        video.type,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));

      const matchesCategory =
        category === "All" || video.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [videos, search, category]);

  // Ordinary-user login: email is verified by OTP.
  // The phone number is contact information until SMS verification is configured.
  if (isLoginRoute) {
    const requestedReturnTo =
      new URLSearchParams(location.search).get("returnTo") || "/";

    const safeReturnTo =
      requestedReturnTo.startsWith("/") &&
      !requestedReturnTo.startsWith("//")
        ? requestedReturnTo
        : "/";

    return (
      <div className="app admin-page">
        <header className="navbar">
          <Link className="brand" to="/" aria-label="StreamVault home">
            <span className="brand-icon">S</span>
            <span>
              Stream<span className="brand-highlight">Vault</span>
            </span>
          </Link>

          <Link className="secondary-button" to="/">
            Public website
          </Link>
        </header>

        <main className="admin-main">
          <section className="library-section">
            <span className="eyebrow">YOUR STREAMVAULT ACCOUNT</span>
            <h1>Sign in to watch</h1>

            <p className="section-description">
              We'll email you a six-digit code. Your phone number is saved
              as contact information and is not SMS-verified yet.
            </p>

            {!userSessionChecked ? (
              <div className="status-panel">Checking your session…</div>
            ) : isUser ? (
              <div className="add-video-form">
                <h2>You're signed in</h2>
                <p>{signedInUserEmail}</p>
                <Link className="primary-button" to={safeReturnTo}>
                  Continue to StreamVault
                </Link>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleUserLogout}
                  disabled={userAuthBusy}
                >
                  {userAuthBusy ? "Please wait…" : "Log out"}
                </button>
              </div>
            ) : (
              <form
                className="add-video-form"
                onSubmit={
                  userOtpRequested
                    ? handleVerifyUserOtp
                    : handleRequestUserOtp
                }
              >
                <h2>
                  {userOtpRequested
                    ? "Verify your email"
                    : "Create an account or sign in"}
                </h2>

                <label>
                  Email address
                  <input
                    type="email"
                    value={userEmailInput}
                    onChange={(event) =>
                      setUserEmailInput(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    disabled={userOtpRequested || userAuthBusy}
                  />
                </label>

                <label>
                  Phone number (contact only; not verified by SMS)
                  <input
                    type="tel"
                    value={userPhoneInput}
                    onChange={(event) =>
                      setUserPhoneInput(event.target.value)
                    }
                    placeholder="e.g. +91 98765 43210"
                    autoComplete="tel"
                    required
                    disabled={userAuthBusy}
                  />
                </label>

                {userOtpRequested && (
                  <label>
                    Six-digit email code
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={userOtp}
                      onChange={(event) =>
                        setUserOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Enter code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      disabled={userAuthBusy}
                    />
                  </label>
                )}

                <button type="submit" disabled={userAuthBusy}>
                  {userAuthBusy
                    ? "Please wait…"
                    : userOtpRequested
                      ? "Verify code and sign in"
                      : "Send email code"}
                </button>

                {userOtpRequested && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={userAuthBusy}
                    onClick={() => {
                      setUserOtpRequested(false);
                      setUserOtp("");
                      setUserAuthMessage("");
                    }}
                  >
                    Change email or phone
                  </button>
                )}

                {userAuthMessage && (
                  <p role="status">{userAuthMessage}</p>
                )}

                <p className="section-description">
                  Administrator access remains separate.{" "}
                  <Link to="/admin">Administrator sign in</Link>
                </p>
              </form>
            )}
          </section>
        </main>
      </div>
    );
  }

  // Video player route: a normal user or administrator must be signed in.
  if (isWatchRoute) {
    if (loading || !sessionChecked || !userSessionChecked) {
      return (
        <main className="admin-main">
          <p>Loading your video…</p>
        </main>
      );
    }

    if (error || !watchVideo || !watchVideo.videoUrl) {
      return (
        <main className="admin-main">
          <h1>Video unavailable</h1>
          <p>
            The video could not be found or its playback URL is unavailable.
          </p>
          <Link to="/">Back to StreamVault</Link>
        </main>
      );
    }

    if (!isUser && !isAdmin) {
      return (
        <main className="admin-main">
          <Link to="/">← Back to StreamVault</Link>
          <h1>Sign in to watch</h1>
          <p>
            Please sign in with your email to watch videos and save your
            playback progress.
          </p>
          <Link
            className="primary-button"
            to={`/login?returnTo=${encodeURIComponent(currentPath)}`}
          >
            Sign in to continue →
          </Link>
        </main>
      );
    }

    return (
      <main className="admin-main">
        <Link to="/">← Back to StreamVault</Link>
        <h1>{watchVideo.title}</h1>

        <video
          ref={videoRef}
          controls
          muted={false}
          playsInline
          preload="metadata"
          poster={getVideoThumbnail(watchVideo) || undefined}
          style={{
            width: "100%",
            maxWidth: "1000px",
            display: "block",
            background: "#000",
          }}
          src={watchVideo.videoUrl}
          onLoadedMetadata={handleVideoMetadataLoaded}
          onTimeUpdate={() => savePlaybackProgress(false)}
          onPause={() => savePlaybackProgress(true)}
          onEnded={() => savePlaybackProgress(true)}
        >
          Your browser does not support video playback.
        </video>

        {playbackMessage && (
          <p className="playback-status" role="status">
            {playbackMessage}
          </p>
        )}

        <p>{watchVideo.description}</p>
      </main>
    );
  }

  // Administrator dashboard.
  if (isAdminRoute) {
    return (
      <div className="app admin-page">
        <header className="navbar">
          <Link className="brand" to="/" aria-label="StreamVault home">
            <span className="brand-icon">S</span>
            <span>
              Stream<span className="brand-highlight">Vault</span>
            </span>
          </Link>

          <div className="admin-header-actions">
            <Link className="secondary-button" to="/">
              Public website
            </Link>

            {isAdmin && (
              <button
                className="refresh-button"
                type="button"
                disabled={authLoading}
                onClick={handleLogout}
              >
                {authLoading ? "Please wait…" : "Log out"}
              </button>
            )}
          </div>
        </header>

        <main className="admin-main">
          <section className="library-section">
            <span className="eyebrow">PRIVATE CONTROL PANEL</span>
            <h1>StreamVault Dashboard</h1>
            <p className="section-description">
              Manage your collection and upload media.
            </p>

            {!sessionChecked ? (
              <div className="status-panel">Checking admin session…</div>
            ) : !isAdmin ? (
              <form
                className="add-video-form"
                onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}
              >
                <h2>Admin sign in</h2>
                <p className="section-description">
                  This dashboard is restricted to your authorized email.
                </p>

                <label>
                  Admin email
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                    placeholder="Your authorized email"
                    autoComplete="email"
                    required
                    disabled={otpRequested || authLoading}
                  />
                </label>

                {otpRequested && (
                  <label>
                    Six-digit email code
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="Enter code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      disabled={authLoading}
                    />
                  </label>
                )}

                <button type="submit" disabled={authLoading}>
                  {authLoading
                    ? "Please wait…"
                    : otpRequested
                      ? "Verify code"
                      : "Send email code"}
                </button>

                {otpRequested && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={authLoading}
                    onClick={() => {
                      setOtpRequested(false);
                      setOtp("");
                      setAuthMessage("");
                    }}
                  >
                    Change email
                  </button>
                )}

                {authMessage && <p role="status">{authMessage}</p>}
              </form>
            ) : (
              <>
                <div className="dashboard-welcome">
                  <h2>Welcome back</h2>
                  <p>Your backend admin session is verified.</p>
                </div>

                <form
                  className="add-video-form"
                  onSubmit={handleUploadVideo}
                >
                  <h2>Upload an MP4 video</h2>
                  <p className="section-description">
                    Upload the source file and optional poster image. Large
                    uploads depend on your Cloudinary plan and upload limits.
                  </p>

                  <label>
                    Video title
                    <input
                      type="text"
                      value={uploadData.title}
                      onChange={(event) =>
                        updateUploadField("title", event.target.value)
                      }
                      placeholder="e.g. Interstellar"
                      required
                      disabled={uploading}
                    />
                  </label>

                  <label>
                    Category
                    <input
                      type="text"
                      value={uploadData.category}
                      onChange={(event) =>
                        updateUploadField("category", event.target.value)
                      }
                      placeholder="e.g. Sci-Fi"
                      required
                      disabled={uploading}
                    />
                  </label>

                  <label>
                    Type
                    <select
                      value={uploadData.type}
                      onChange={(event) =>
                        updateUploadField("type", event.target.value)
                      }
                      disabled={uploading}
                    >
                      <option value="Movie">Movie</option>
                      <option value="Series">Series</option>
                    </select>
                  </label>

                  <label>
                    Description
                    <textarea
                      value={uploadData.description}
                      onChange={(event) =>
                        updateUploadField("description", event.target.value)
                      }
                      placeholder="Write a short description"
                      rows={3}
                      required
                      disabled={uploading}
                    />
                  </label>

                  <label>
                    MP4 video file
                    <input
                      id="mp4-file"
                      type="file"
                      accept="video/*,.mp4,.mov,.webm,.m4v"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setVideoFile(file);
                      }}
                      required
                      disabled={uploading}
                    />
                  </label>

                  {videoFile && (
                    <p className="file-info">
                      Selected: {videoFile.name} (
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </p>
                  )}

                  <label>
                    Thumbnail image (optional)
                    <input
                      id="thumbnail-file"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setThumbnailFile(event.target.files?.[0] || null)
                      }
                      disabled={uploading}
                    />
                  </label>

                  {thumbnailFile && (
                    <img
                      className="video-thumbnail"
                      src={URL.createObjectURL(thumbnailFile)}
                      alt="Selected thumbnail preview"
                    />
                  )}

                  <p className="section-description">
                    Quality options such as 360p, 480p, 720p, and 1080p only
                    work when the media provider has generated or enabled
                    those renditions. Uploading one MP4 does not create every
                    resolution automatically.
                  </p>

                  <button type="submit" disabled={uploading}>
                    {uploading ? "Uploading…" : "Upload video"}
                  </button>

                  {uploadProgress && <p role="status">{uploadProgress}</p>}
                  {uploadMessage && <p role="status">{uploadMessage}</p>}
                </form>

                <form className="add-video-form" onSubmit={handleAddVideo}>
                  <h2>Add external video metadata</h2>
                  <p className="section-description">
                    Use this for existing video records or direct metadata
                    entries. It does not upload a file.
                  </p>

                  <label>
                    Title
                    <input
                      value={formData.title}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          title: event.target.value,
                        })
                      }
                      required
                      placeholder="Title"
                    />
                  </label>

                  <label>
                    Category
                    <input
                      value={formData.category}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          category: event.target.value,
                        })
                      }
                      required
                      placeholder="Category"
                    />
                  </label>

                  <label>
                    Type
                    <select
                      value={formData.type}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          type: event.target.value,
                        })
                      }
                    >
                      <option value="Movie">Movie</option>
                      <option value="Series">Series</option>
                    </select>
                  </label>

                  <label>
                    Description
                    <textarea
                      value={formData.description}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          description: event.target.value,
                        })
                      }
                      rows={3}
                      required
                      placeholder="Description"
                    />
                  </label>

                  <button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save metadata"}
                  </button>

                  {formMessage && <p role="status">{formMessage}</p>}
                </form>

                <section className="library-section">
                  <div className="section-heading">
                    <h2>Manage published videos</h2>
                    <button
                      className="refresh-button"
                      type="button"
                      onClick={fetchVideos}
                      disabled={loading}
                    >
                      {loading ? "Loading…" : "Refresh"}
                    </button>
                  </div>

                  {formMessage && <p role="status">{formMessage}</p>}

                  <div className="video-grid">
                    {videos.map((video) => (
                      <article className="video-card" key={video.id}>
                        <div className="video-art">
                          {getVideoThumbnail(video) ? (
                            <img
                              className="video-thumbnail"
                              src={getVideoThumbnail(video)}
                              alt={`${video.title || "Video"} thumbnail`}
                              loading="lazy"
                              onError={(event) =>
                                handleThumbnailError(video, event)
                              }
                            />
                          ) : (
                            <span className="video-art-letter">
                              {(video.title || "S")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        {video.videoUrl && (
  <video
    className="admin-video-preview"
    controls
    playsInline
    preload="none"
    poster={getVideoThumbnail(video) || undefined}
    src={video.videoUrl}
  >
    Your browser does not support video playback.
  </video>
)}

                        <div className="video-details">
                          <h3>{video.title || "Untitled video"}</h3>
                          <p>{video.category || "Uncategorized"}</p>

                          {video.videoUrl && (
                            <Link
                              className="primary-button"
                              to={`/watch/${encodeURIComponent(video.id)}`}
                            >
                              Watch video →
                            </Link>
                          )}

                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => deleteVideo(video)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </section>
        </main>
      </div>
    );
  }

  // Public homepage.
  return (
    <div className="app">
      <header className="navbar">
        <Link className="brand" to="/" aria-label="StreamVault home">
          <span className="brand-icon">S</span>
          <span>
            Stream<span className="brand-highlight">Vault</span>
          </span>
        </Link>

        <nav className="nav-links">
          <a className="nav-active" href="#home">Home</a>
          <a href="#library">My Library</a>
        </nav>

        <div className="public-header-actions">
          {isUser ? (
            <button
              className="secondary-button"
              type="button"
              onClick={handleUserLogout}
              disabled={userAuthBusy}
            >
              {userAuthBusy ? "Please wait…" : "Log out"}
            </button>
          ) : (
            <Link className="secondary-button" to="/login">
              Sign in
            </Link>
          )}

          <button
            className="refresh-button"
            onClick={fetchVideos}
            disabled={loading}
            type="button"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </header>

      <main id="home">
        <section className="hero hero-cinematic">
          <div className="hero-backdrop" aria-hidden="true" />
          <div className="hero-grain" aria-hidden="true" />

          <div className="hero-topline">
            <span className="hero-kicker">
              <span className="hero-kicker-line" />
              THE STREAMVAULT COLLECTION
            </span>
            <span className="hero-edition">EST. FOR THE CURIOUS</span>
          </div>

          <div className="hero-content">
            <div className="hero-feature-label">
              <span className="hero-feature-dot" />
              YOUR NEXT OBSESSION STARTS HERE
            </div>

            <h1>
              Stories that
              <br />
              <span>stay with you.</span>
            </h1>

            <p className="hero-description">
              A world of cinema, collected in one place. Discover your next
              favourite and make every viewing moment feel extraordinary.
            </p>

            <div className="hero-actions">
              <a
                className="primary-button hero-watch-button"
                href="#library"
              >
                <span className="hero-button-play" aria-hidden="true">
                  ▶
                </span>
                Explore the collection
                <span className="hero-button-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>

            <div className="hero-bottom-meta">
              <div className="hero-stat">
                <span className="hero-stat-number">
                  {String(videos.length).padStart(2, "0")}
                </span>
                <span className="hero-stat-label">
                  TITLES IN YOUR VAULT
                </span>
              </div>

              <span className="hero-meta-divider" />

              <div className="hero-stat">
                <span className="hero-stat-number">
                  {String(Math.max(0, categories.length - 1)).padStart(2, "0")}
                </span>
                <span className="hero-stat-label">COLLECTIONS</span>
              </div>

              <span className="hero-meta-note">
                PERSONALLY YOURS. ALWAYS.
              </span>
            </div>
          </div>

          <div className="hero-image-caption" aria-hidden="true">
            <span>THE ART OF WATCHING</span>
            <span>01 / STREAMVAULT</span>
          </div>

          <a
            className="hero-scroll-cue"
            href="#library"
            aria-label="Scroll to collection"
          >
            <span className="hero-scroll-line" />
            <span>SCROLL TO DISCOVER</span>
          </a>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR COLLECTION</span>
              <h2>Explore your vault</h2>
              <p className="section-description">
                Discover movies and series in your collection.
              </p>
            </div>

            <div className="result-count">
              {filteredVideos.length}{" "}
              {filteredVideos.length === 1 ? "title" : "titles"}
            </div>
          </div>

          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search titles, genres…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search videos"
              />
            </label>

            <div className="category-filters">
              {categories.map((item) => (
                <button
                  key={item}
                  className={`filter-button ${
                    category === item ? "selected" : ""
                  }`}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="status-panel">
              <div className="spinner" />
              <p>Opening your vault…</p>
            </div>
          )}

          {!loading && error && (
            <div className="status-panel error-panel">
              <div className="status-icon">!</div>
              <h3>Connection unavailable</h3>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={fetchVideos}
                type="button"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredVideos.length === 0 && (
            <div className="status-panel">
              <div className="empty-icon">▤</div>

              <h3>
                {videos.length === 0
                  ? "Your vault is waiting"
                  : "No matching titles"}
              </h3>

              <p>
                {videos.length === 0
                  ? "Published videos will appear here."
                  : "Try a different search or category."}
              </p>

              {(search || category !== "All") && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && filteredVideos.length > 0 && (
            <div className="video-grid">
              {filteredVideos.map((video) => (
                <article className="video-card" key={video.id}>
                  <div className="video-art">
                    {getVideoThumbnail(video) ? (
                      <img
                        className="video-thumbnail"
                        key={`${video.id}-${video.thumbnailUrl || video.videoUrl || "poster"}`}
                        src={getVideoThumbnail(video)}
                        alt={`${video.title || "Video"} thumbnail`}
                        loading="lazy"
                        onError={(event) =>
                          handleThumbnailError(video, event)
                        }
                      />
                    ) : (
                      <>
                        <div className="video-art-decoration" />
                        <span className="video-art-letter">
                          {(video.title || "S").charAt(0).toUpperCase()}
                        </span>
                      </>
                    )}

                    <span className="video-type">
                      {video.type || "Video"}
                    </span>
                    <span className="video-play" aria-hidden="true">
                      ▶
                    </span>
                  </div>

                  <div className="video-details">
                    <div className="video-meta">
                      <span>{video.category || "Uncategorized"}</span>
                      <span className="status-dot" />
                      <span>In your vault</span>
                    </div>

                    <h3>{video.title || "Untitled video"}</h3>
                    <p>
                      {video.description || "No description available."}
                    </p>

                    {video.videoUrl && (
                      <Link
                        className="primary-button"
                        to={`/watch/${encodeURIComponent(video.id)}`}
                      >
                        Watch now →
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-icon">S</span>
          <span>
            Stream<span className="brand-highlight">Vault</span>
          </span>
        </Link>

        <p>One place for everything you love.</p>

        <span className="footer-status">
          <span className="status-dot" />
          React · Spring Boot · MongoDB
        </span>
      </footer>
    </div>
  );
}

export default App;