
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://streamvault-lmsr.onrender.com/api/videos";
const AUTH_URL = "https://streamvault-lmsr.onrender.com/api/auth";

function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [formData, setFormData] = useState({
    title: "",
    category: "Sci-Fi",
    type: "Movie",
    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

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
      setError(
        "Could not connect to StreamVault. Make sure the Spring Boot backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, []);
  
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
      throw new Error(data.message || `Request failed: HTTP ${response.status}`);
    }

    setOtpRequested(true);
    setAuthMessage(data.message || "Check your email for the verification code.");
  } catch (err) {
    console.error("OTP request error:", err);
    setAuthMessage(err.message || "Could not request a verification code.");
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
      throw new Error(data.message || `Verification failed: HTTP ${response.status}`);
    }

    setIsAdmin(true);
    setOtp("");
    setOtpRequested(false);
    setAuthMessage("Admin login successful.");
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
      headers: {
        "X-XSRF-TOKEN": csrfToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Logout failed: HTTP ${response.status}`);
    }

    setIsAdmin(false);
    setOtp("");
    setOtpRequested(false);
    setFormMessage("");
    setAuthMessage("You have logged out.");
  } catch (err) {
    console.error("Logout error:", err);
    setAuthMessage(err.message || "Could not log out.");
  } finally {
    setAuthLoading(false);
  }
}




async function getCsrfToken() {
  const response = await fetch(`${AUTH_URL}/csrf`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Could not initialize security: HTTP ${response.status}`);
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
      throw new Error(`Session check failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    setIsAdmin(data.isAdmin === true);
  } catch (err) {
    console.error("Admin session check failed:", err);
    setIsAdmin(false);
  }
}

useEffect(() => {
  checkAdminSession();
}, []);

  async function handleAddVideo(event) {
    event.preventDefault();
    setSaving(true);
    setFormMessage("");

    try {
const response = await fetch(`${API_URL}/demo`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(formData),
});


      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      setFormData({
        title: "",
        category: "Sci-Fi",
        type: "Movie",
        description: "",
      });

      setFormMessage("Video added successfully!");
      await fetchVideos();
    } catch (err) {
      console.error("Add video error:", err);
      setFormMessage(
        "Could not add video. Check the backend and API connection."
      );
    } finally {
      setSaving(false);
    }
  }

const deleteVideo = async (video) => {
  const confirmed = window.confirm(
    `Delete "${video.title}" from your library?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `https://streamvault-lmsr.onrender.com/api/videos/${encodeURIComponent(video.id)}`,
      {
  method: "DELETE",
  credentials: "include"
}
    );

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }

    await fetchVideos();
  } catch (err) {
    console.error("Delete video error:", err);
    alert("Could not delete video. Please try again.");
  }
};


  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(
        videos.map((video) => video.category).filter(Boolean)
      ),
    ];
  }, [videos]);

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

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="StreamVault home">
          <span className="brand-icon">S</span>
          <span>
            Stream<span className="brand-highlight">Vault</span>
          </span>
        </a>

        <nav className="nav-links">
          <a className="nav-active" href="#home">Home</a>
          <a href="#library">My Library</a>
        </nav>

        <button
          className="refresh-button"
          onClick={fetchVideos}
          disabled={loading}
          type="button"
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </header>

      <main id="home">
       
<section className="library-section" id="admin-access">
  <div className="section-heading">
    <div>
      <span className="eyebrow">OWNER ACCESS</span>
      <h2>{isAdmin ? "Admin access enabled" : "Admin login"}</h2>
      <p className="section-description">
        {isAdmin
          ? "You are signed in and can manage your vault."
          : "Sign in with your authorized email to manage your collection."}
      </p>
    </div>
  </div>

  {!isAdmin ? (
    <form
      className="add-video-form"
      onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}
    >
      <label>
        Admin email
        <input
          type="email"
          value={adminEmail}
          onChange={(event) => setAdminEmail(event.target.value)}
          placeholder="Enter your authorized email"
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
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Enter the code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={authLoading}
          />
        </label>
      )}

      <button type="submit" disabled={authLoading}>
        {authLoading
          ? "Please wait..."
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
    <div className="add-video-form">
      <p>Signed in as {adminEmail}</p>
      <button
        type="button"
        disabled={authLoading}
        onClick={handleLogout}
      >
        {authLoading ? "Please wait..." : "Log out"}
      </button>
      {authMessage && <p role="status">{authMessage}</p>}
    </div>
  )}
</section>

        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              YOUR PERSONAL ENTERTAINMENT HUB
            </span>

            <h1>
              Your world.
              <br />
              <span>One vault.</span>
            </h1>

            <p>
              Discover and organize your favorite movies and series in one
              place.
            </p>

            <a className="primary-button" href="#library">
              Explore library <span>→</span>
            </a>

            <div className="hero-stats">
              <div>
                <strong>{videos.length}</strong>
                <span>Titles</span>
              </div>
              <div>
                <strong>{categories.length - 1}</strong>
                <span>Categories</span>
              </div>
              <div>
                <strong>Live</strong>
                <span>Database</span>
              </div>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one"></div>
            <div className="art-orbit orbit-two"></div>
            <div className="art-circle">
              <div className="play-icon">▶</div>
            </div>
            <div className="art-label label-one">MOVIES</div>
            <div className="art-label label-two">SERIES</div>
            <div className="art-label label-three">YOUR LIBRARY</div>
          </div>
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR COLLECTION</span>
              <h2>Explore your vault</h2>
              <p className="section-description">
                Your saved entertainment, powered by MongoDB.
              </p>
            </div>

            <div className="result-count">
              {filteredVideos.length}{" "}
              {filteredVideos.length === 1 ? "title" : "titles"}
            </div>
          </div>

          {isAdmin && (
  <form className="add-video-form" onSubmit={handleAddVideo}>
            <h3>Add a video to your vault</h3>

            <label>
              Title
              <input
                type="text"
                value={formData.title}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    title: event.target.value,
                  })
                }
                placeholder="e.g. Dune: Part Two"
                required
              />
            </label>

            <label>
              Category
              <input
                type="text"
                value={formData.category}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    category: event.target.value,
                  })
                }
                placeholder="e.g. Sci-Fi, Drama, Comedy"
                required
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
                placeholder="Write a short description"
                rows={3}
                required
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Video"}
            </button>

           {formMessage && <p role="status">{formMessage}</p>}
  </form>
)}

          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search titles, genres..."
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
              <div className="spinner"></div>
              <p>Opening your vault...</p>
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
                  ? "Videos saved in your database will appear here."
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
                 {isAdmin && (
  <button
    type="button"
    className="secondary-button"
    onClick={() => deleteVideo(video)}
  >
    Delete
  </button>
)}
                  <div className="video-art">
                    <div className="video-art-decoration"></div>
                    <span className="video-type">
                      {video.type || "Video"}
                    </span>
                    <span className="video-art-letter">
                      {(video.title || "S").charAt(0).toUpperCase()}
                    </span>
                    <span className="video-play" aria-hidden="true">
                      ▶
                    </span>
                  </div>

                  <div className="video-details">
                    <div className="video-meta">
                      <span>{video.category || "Uncategorized"}</span>
                      <span className="status-dot"></span>
                      <span>In your vault</span>
                    </div>

                    <h3>{video.title || "Untitled video"}</h3>
                    <p>
                      {video.description || "No description available."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon">S</span>
          <span>
            Stream<span className="brand-highlight">Vault</span>
          </span>
        </a>

        <p>One place for everything you love.</p>

        <span className="footer-status">
          <span className="status-dot"></span>
          React · Spring Boot · MongoDB
        </span>
      </footer>
    </div>
  );
}

export default App;
