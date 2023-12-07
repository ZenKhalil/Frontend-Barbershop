import services from "./taps/services.js";
import bookings from "./taps/bookings.js";

let isBookingPageLoaded = false;

// Global Setup
document.addEventListener("DOMContentLoaded", function () {
  setupNavigation();
  services.loadPriceList();
  bookings.loadBookingPage();

  // Check if a section is saved in local storage
  const savedSection = localStorage.getItem("currentSection");

  // Show the saved section or default to the home page
  if (savedSection) {
    showSection(savedSection);
  } else {
    loadHomePage();
  }

});

function showSection(sectionId) {
  document.querySelectorAll("main section").forEach((section) => {
    section.style.display = "none";
  });

  const selectedSection = document.getElementById(sectionId);
  if (selectedSection) {
    selectedSection.style.display = "block";

    if (sectionId === "booking-section") {
      if (!isBookingPageLoaded) {
        bookings.loadBookingPage();
        isBookingPageLoaded = true;
      }
    } else {
      isBookingPageLoaded = false; // Reset the flag if we navigate away from booking
    }

    localStorage.setItem("currentSection", sectionId);
  }
}

// Navigation Setup
function setupNavigation() {
  document.querySelectorAll("#main-nav a").forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const sectionId = this.getAttribute("href").substring(1); // Remove '#' from href
      showSection(sectionId);
    });
  });
}

// Section Loaders
function loadHomePage() {
  // Set the current section to home in local storage
  localStorage.setItem("currentSection", "home-section");

  // Update the content of the home section
  const homeHtml = `
    <div class="welcome">
      <h2>Welcome to The Barber Shop</h2>
      <p>Discover our world-class services and meet our talented team.</p>
      <!-- Add more content as needed -->
    </div>`;
  updateMainContent(homeHtml, "home-section");

  showSection("home-section");
}


// Utility Functions
function updateMainContent(html, sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.innerHTML = html;
  }
}

