const token = localStorage.getItem("jwt_token");
let session = null;

try {
  session = JSON.parse(localStorage.getItem("points_app_session") || "null");
} catch {
  session = null;
}

if (!token || session?.isAdmin !== true) {
  const destination = encodeURIComponent("/suggested-routes.html");
  window.location.replace(
    token ? "/index.html" : `/login.html?redirect=${destination}`,
  );
} else {
  const suggestionList = document.getElementById("suggestionList");
  const suggestionCount = document.getElementById("suggestionCount");
  const suggestionStatus = document.getElementById("suggestionStatus");
  const refreshButton = document.getElementById("refreshButton");
  const signOutButton = document.getElementById("signOutButton");

  function showError(message) {
    suggestionStatus.textContent = message;
    suggestionStatus.classList.add("isVisible");
  }

  function clearError() {
    suggestionStatus.textContent = "";
    suggestionStatus.classList.remove("isVisible");
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Unknown date"
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
  }

  async function downloadSuggestion(suggestion) {
    clearError();
    try {
      const response = await fetch(
        `/api/annotator/suggestions/${suggestion.suggestionId}/file`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to download the suggestion.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = suggestion.fileName || "suggested-route.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showError(error.message || "Unable to download the suggestion.");
    }
  }

  function renderSuggestions(suggestions) {
    suggestionList.replaceChildren();
    suggestionCount.textContent = `${suggestions.length} pending ${
      suggestions.length === 1 ? "suggestion" : "suggestions"
    }`;

    if (suggestions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "emptyState";
      empty.textContent = "No route suggestions have been submitted yet.";
      suggestionList.appendChild(empty);
      return;
    }

    suggestions.forEach((suggestion) => {
      const card = document.createElement("article");
      card.className = "suggestionCard";

      const content = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = suggestion.title;
      const description = document.createElement("p");
      description.textContent = suggestion.description;
      const meta = document.createElement("div");
      meta.className = "suggestionMeta";

      const submittedBy = document.createElement("span");
      submittedBy.innerHTML = "<strong>Submitted by:</strong> ";
      submittedBy.append(document.createTextNode(suggestion.submittedBy));
      const createdAt = document.createElement("span");
      createdAt.innerHTML = "<strong>Received:</strong> ";
      createdAt.append(document.createTextNode(formatDate(suggestion.createdAt)));
      const fileName = document.createElement("span");
      fileName.innerHTML = "<strong>File:</strong> ";
      fileName.append(document.createTextNode(suggestion.fileName));
      meta.append(submittedBy, createdAt, fileName);
      content.append(title, description, meta);

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.textContent = "Download JSON";
      downloadButton.addEventListener("click", () => downloadSuggestion(suggestion));
      card.append(content, downloadButton);
      suggestionList.appendChild(card);
    });
  }

  async function loadSuggestions() {
    clearError();
    refreshButton.disabled = true;
    suggestionCount.textContent = "Loading…";
    try {
      const response = await fetch("/api/annotator/suggestions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        window.location.replace("/index.html");
        return;
      }
      const body = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(body.error || "Unable to load suggested routes.");
      }
      renderSuggestions(Array.isArray(body) ? body : []);
    } catch (error) {
      suggestionList.replaceChildren();
      suggestionCount.textContent = "Unable to load";
      showError(error.message || "Unable to load suggested routes.");
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", loadSuggestions);
  signOutButton.addEventListener("click", () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("points_app_session");
    window.location.replace("/login.html");
  });

  loadSuggestions();
}
