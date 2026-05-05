document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authStatus = document.getElementById("auth-status");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const loginModal = document.getElementById("login-modal");
  const closeLoginBtn = document.getElementById("close-login-btn");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const loginSubmitBtn = document.getElementById("login-submit-btn");
  const teacherUsernameInput = document.getElementById("teacher-username");
  const teacherPasswordInput = document.getElementById("teacher-password");

  const teacherSession = {
    username: "",
    password: "",
    loggedIn: false,
  };

  function getAuthHeaders() {
    if (!teacherSession.loggedIn) {
      return {};
    }

    return {
      "X-Teacher-Username": teacherSession.username,
      "X-Teacher-Password": teacherSession.password,
    };
  }

  function updateTeacherControls() {
    const isEnabled = teacherSession.loggedIn;
    signupForm
      .querySelectorAll("input, select, button")
      .forEach((element) => {
        element.disabled = !isEnabled;
      });

    if (isEnabled) {
      authStatus.textContent = `Logged in as ${teacherSession.username}. You can now register and unregister students.`;
      authStatus.className = "auth-status success";
      logoutBtn.classList.remove("hidden");
      loginSubmitBtn.classList.add("hidden");
    } else {
      authStatus.textContent =
        "Teachers must log in to register or unregister students.";
      authStatus.className = "auth-status info";
      logoutBtn.classList.add("hidden");
      loginSubmitBtn.classList.remove("hidden");
    }
  }

  let lastFocusedElement = null;
  const modalFocusableSelector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getModalFocusableElements() {
    return Array.from(loginModal.querySelectorAll(modalFocusableSelector)).filter(
      (element) => !element.classList.contains("hidden")
    );
  }

  function handleLoginModalKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLoginModal();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getModalFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      loginModal.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstElement || activeElement === loginModal) {
        event.preventDefault();
        lastElement.focus();
      }
      return;
    }

    if (activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function openLoginModal() {
    lastFocusedElement = document.activeElement;
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
    if (!loginModal.hasAttribute("tabindex")) {
      loginModal.setAttribute("tabindex", "-1");
    }
    loginModal.addEventListener("keydown", handleLoginModalKeydown);

    const focusableElements = getModalFocusableElements();
    if (teacherUsernameInput && !teacherUsernameInput.disabled) {
      teacherUsernameInput.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      loginModal.focus();
    }
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
    loginModal.removeEventListener("keydown", handleLoginModalKeydown);

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    } else if (userMenuBtn) {
      userMenuBtn.focus();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        teacherSession.loggedIn
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!teacherSession.loggedIn) {
      messageDiv.textContent = "Teacher login required.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherSession.loggedIn) {
      messageDiv.textContent = "Teacher login required.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = teacherUsernameInput.value.trim();
    const password = teacherPasswordInput.value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        teacherSession.username = username;
        teacherSession.password = password;
        teacherSession.loggedIn = true;

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        teacherPasswordInput.value = "";
        closeLoginModal();
        updateTeacherControls();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Login failed.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to log in. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", () => {
    teacherSession.username = "";
    teacherSession.password = "";
    teacherSession.loggedIn = false;
    loginForm.reset();
    updateTeacherControls();
    fetchActivities();
    closeLoginModal();

    messageDiv.textContent = "Logged out.";
    messageDiv.className = "success";
    messageDiv.classList.remove("hidden");
  });

  userMenuBtn.addEventListener("click", openLoginModal);
  closeLoginBtn.addEventListener("click", closeLoginModal);
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  // Initialize app
  updateTeacherControls();
  fetchActivities();
});
