import { Calendar } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Declare calendar as a global variable
let calendar;

// Load the booking page with necessary setup
function loadBookingPage() {
  populateBarbers().then(initializeCalendar);
  populateServices();
  setupBookingForm();
}

// Initialize the calendar with weekly view and business hours
function initializeCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // Define the opening hours for each day of the week
  const openingHours = {
    1: { startTime: "10:00", endTime: "18:00" }, // Monday
    2: { startTime: "10:00", endTime: "18:00" }, // Tuesday
    3: { startTime: "10:00", endTime: "18:00" }, // Wednesday
    4: { startTime: "10:00", endTime: "18:00" }, // Thursday
    5: { startTime: "10:00", endTime: "18:00" }, // Friday
    6: { startTime: "10:00", endTime: "15:00" }, // Saturday
  };

  // Initialize the FullCalendar
  calendar = new Calendar(calendarEl, {
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: "timeGridWeek",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "timeGridWeek,timeGridDay",
    },
    slotDuration: "00:15:00",
    slotLabelInterval: "00:15",
    allDaySlot: false,
    hiddenDays: [0], // Hide Sunday
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      startTime: "10:00",
      endTime: "18:00",
    },
    slotLabelFormat: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    dateClick: handleDateClick,
    slotMinTime: "10:00",
    slotMaxTime: "18:00", // Adjust this for Saturday if needed
    slotLabelContent: (arg) => {
      const dayOfWeek = arg.date.getDay();
      const { startTime, endTime } = openingHours[dayOfWeek] || {};
      if (startTime && endTime) {
        const slotTime = arg.text;
        if (slotTime >= startTime && slotTime < endTime) {
          return arg.text;
        }
      }
      return "";
    },
    datesSet: function (dateInfo) {
      // Fetch new set of unavailable timeslots for the current view range
      const barberSelect = document.getElementById("barber-select");
      const barberId = barberSelect.value;
      if (barberId) {
        fetchUnavailableTimeslotsForPeriod(
          dateInfo.startStr,
          dateInfo.endStr,
          barberId
        );
      }
    },
  });

  calendar.render();
}

function processDate(dateStr) {
  console.log("Processing date string:", dateStr); // Log the raw date string

  // Remove day of the week and timezone abbreviation, and keep the 'T' separator
  const formattedDateStr = dateStr
    .replace(/\w{3} /, "")
    .replace(/ GMT\+\d{4} \(\w+\)/, "");

  // Attempt to parse the formatted date string
  const date = new Date(formattedDateStr);
  if (isNaN(date)) {
    console.error("Invalid date format after formatting:", formattedDateStr);
    return null;
  }
  return date.toISOString();
}


function fetchUnavailableTimeslotsForPeriod(start, end, barberId) {
  // Adjust start and end dates to strings if they are Date objects
  start = typeof start === "string" ? start : start.toISOString().split("T")[0];
  end = typeof end === "string" ? end : end.toISOString().split("T")[0];

  // Fetch unavailable timeslots for the barber in the given period
  fetch(
    `http://localhost:3000/api/bookings/unavailable-timeslots?barberId=${barberId}&start=${start}&end=${end}`
  )
    .then((response) => response.json())
    .then((bookedSlots) => {
      console.log("Received booked slots:", bookedSlots);
      if (!Array.isArray(bookedSlots)) {
        console.error("Expected an array of booked slots:", bookedSlots);
        return;
      }
      // Clear out any existing 'unavailable' events
      let existingEvents = calendar.getEvents();
      existingEvents.forEach((event) => {
        if (event.extendedProps.isUnavailable) {
          event.remove();
        }
      });

      // Add new events for each booked slot
      bookedSlots.forEach((slot) => {
        calendar.addEvent({
          title: "Unavailable",
          start: slot.start,
          end: slot.end,
          allDay: false,
          color: "red",
          extendedProps: { isUnavailable: true },
        });
      });
    })
    .catch((error) =>
      console.error("Error fetching unavailable timeslots:", error)
    );
}

// Populate service bubbles from the API
function populateServices() {
  fetch("http://localhost:3000/api/services")
    .then((response) => response.json())
    .then((services) => {
      if (!Array.isArray(services)) {
        throw new Error('Expected services to be an array');
      }
      // Now that we have the services, populate the bubbles.
      populateServiceBubbles(services.filter(s => s.is_main === 1), 'main-service-options', true);
      populateServiceBubbles(services.filter(s => s.is_main !== 1), 'extra-service-options', false);
    })
    .catch((error) => console.error("Error fetching services:", error));
}

document.querySelectorAll(".service-button").forEach((button) => {
  button.addEventListener("click", () => {
    // For radio buttons, unselect all first
    if (button.querySelector('input[type="radio"]')) {
      document
        .querySelectorAll(".service-button.selected")
        .forEach((selectedButton) => {
          selectedButton.classList.remove("selected");
        });
    }

    // Toggle 'selected' class
    button.classList.toggle("selected");

    // Check the input inside this button
    button.querySelector("input").checked =
      button.classList.contains("selected");
  });
});

// Populate barbers from the API
function populateBarbers() {
  return fetch("http://localhost:3000/api/barbers")
    .then((response) => response.json())
    .then((barbers) => {
      const barberSelect = document.getElementById("barber-select");
      let optionsHTML = "";
      barbers.forEach((barber, index) => {
        optionsHTML += `<option value="${barber.barber_id}">${barber.name}</option>`;
        // Set the first barber as selected by default
        if (index === 0) {
          barberSelect.value = barber.barber_id;
        }
      });
      barberSelect.innerHTML = optionsHTML;
    })
    .catch((error) => console.error("Error fetching barbers:", error));
}

// Setup the booking form with event listeners
function setupBookingForm() {
  // This function might be called when the modal is opened
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }

  const barberSelect = document.getElementById("barber-select");
  if (barberSelect) {
    barberSelect.addEventListener("change", handleBarberChange);
  }
}

function setupToggleButtons() {
  document
    .querySelectorAll(".service-button input[type='radio'] + label")
    .forEach((label) => {
      label.addEventListener("click", function () {
        // This will be handled by the 'checked' pseudo-class in CSS
      });
    });

  document
    .querySelectorAll(".service-button input[type='checkbox'] + label")
    .forEach((label) => {
      label.addEventListener("click", function () {
        // This will be handled by the 'checked' pseudo-class in CSS
      });
    });
}


function handleBarberChange() {
  const barberId = this.value || document.getElementById("barber-select").value;
  if (!barberId) {
    console.warn("No barber selected.");
    return;
  }

  fetchUnavailableDates(barberId);

  // Use the calendar instance directly without getApi()
  fetchUnavailableTimeslotsForPeriod(
    calendar.view.activeStart,
    calendar.view.activeEnd
  );
}


// Fetch unavailable dates for the selected barber
function fetchUnavailableDates(barberId) {
  fetch(`http://localhost:3000/api/barber/${barberId}/unavailable-dates`)
    .then((response) => response.json())
    .then((unavailableDates) => {
      unavailableDates.forEach((date) => {
        calendar.addEvent({
          title: "Unavailable",
          start: date,
          allDay: true,
          color: "red",
        });
      });
    })
    .catch((error) =>
      console.error("Error fetching unavailable dates:", error)
    );
}

// Handle date click on the calendar
function handleDateClick(info) {

  // Check if a barber is selected
  const barberSelect = document.getElementById("barber-select");
  if (!barberSelect.value) {
    alert("Please select a barber first.");
    return;
  }

  const selectedDate = info.date;
  const formattedDate = selectedDate.toISOString().split("T")[0];
  const selectedTime = selectedDate
    .toTimeString()
    .split(" ")[0]
    .substring(0, 5);

  // Show the modal
  const modal = document.getElementById("booking-modal");
  modal.classList.remove("hidden");

  // Populate hidden input fields or display fields in the modal
  const hiddenDateField = modal.querySelector("#hidden-date-field");
  if (hiddenDateField) hiddenDateField.value = formattedDate;

  const hiddenTimeField = modal.querySelector("#hidden-time-field");
  if (hiddenTimeField) hiddenTimeField.value = selectedTime;

  // Update the selected date and time display in the modal
  const displayDateField = modal.querySelector("#selected-date");
  if (displayDateField)
    displayDateField.textContent = `Selected Date: ${formattedDate}`;

  const displayTimeField = modal.querySelector("#selected-time");
  if (displayTimeField)
    displayTimeField.textContent = `Selected Time: ${selectedTime}`;

  // Fetch unavailable timeslots for the selected date
  fetchUnavailableTimeslots(barberSelect.value, formattedDate);

  // Highlight the selected time slot on the calendar
  highlightSelectedTimeSlot(selectedDate);
}


// Close the modal if clicked outside of the modal content
window.onclick = function (event) {
  const modal = document.getElementById("booking-modal");
  const modalContent = modal.querySelector(".modal-content");

  if (event.target === modal && !modalContent.contains(event.target)) {
    closeModal();
  }
};


window.closeModal = function () {
  const modal = document.getElementById("booking-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
};

function highlightSelectedTimeSlot(selectedDate) {
  // Clear any previous selection
  let previousSelection = calendar.getEventById("selected-slot");
  if (previousSelection) {
    previousSelection.remove();
  }

  // Create a new event to represent the selection
  calendar.addEvent({
    id: "selected-slot",
    start: selectedDate,
    end: new Date(selectedDate.getTime() + 15 * 60 * 1000), // Assuming a slot duration of 15 minutes
    rendering: "background",
    color: "#ff9f89", // Use a distinct color to indicate selection
    allDay: false,
  });
}


// Fetch unavailable time slots for a given date and barber
function fetchUnavailableTimeslots(barberId, date) {
  fetch(
    `http://localhost:3000/api/bookings/unavailable-timeslots?barberId=${barberId}&date=${date}`
  )
    .then((response) => response.json())
    .then((bookedSlots) => {
      if (!Array.isArray(bookedSlots)) {
        console.error("Unexpected response format:", bookedSlots);
        return;
      }

      // Clear existing unavailable timeslot events
      calendar.getEvents().forEach((event) => {
        if (event.extendedProps.isUnavailable) {
          event.remove();
        }
      });

      // Add new unavailable timeslot events based on the booked slots
      bookedSlots.forEach((slot) => {
        calendar.addEvent({
          title: "Unavailable",
          start: slot.start,
          end: slot.end,
          allDay: false,
          color: "red",
          extendedProps: { isUnavailable: true },
        });
      });
    })
    .catch((error) =>
      console.error("Error fetching unavailable timeslots:", error)
    );
}

// Handle booking form submission
function handleBookingSubmit(event) {
  event.preventDefault();
  
  // Get selected main service ID
  const selectedMainServiceBubble = document.querySelector('#main-service-options .service-bubble.selected');
  const mainServiceId = selectedMainServiceBubble ? selectedMainServiceBubble.dataset.serviceId : null;
  
  if (!mainServiceId) {
    alert('Please select a main service.');
    return; // Stop the form submission if no main service is selected
  }
  
  // Get selected extra services IDs
  const selectedExtraServiceBubbles = document.querySelectorAll('#extra-service-options .service-bubble.selected');
  const extraServiceIds = Array.from(selectedExtraServiceBubbles).map(bubble => bubble.dataset.serviceId);

  // Compile the booking data
  const bookingData = {
    customer_name: event.target.elements['customer_name'].value,
    customer_email: event.target.elements['customer_email'].value,
    customer_phone: event.target.elements['customer_phone'].value,
    barber_id: event.target.elements['barber_id'].value,
    booking_date: document.getElementById('hidden-date-field').value,
    booking_time: document.getElementById('hidden-time-field').value,
    services: [mainServiceId, ...extraServiceIds], // Combine main and extra service IDs
  };

  // Submit the booking data
  fetch("http://localhost:3000/api/bookings/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bookingData),
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    if (data.message) {
      alert(data.message);
    }
  })
  .catch((error) => {
    console.error("Error creating booking:", error);
    alert("Failed to create booking");
  });
}

// Make sure to call this function to initialize the form handling
document.addEventListener('DOMContentLoaded', () => {
  const bookingForm = document.getElementById("booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }
});

function populateServiceBubbles(services, containerId, isMainService) {
  const container = document.getElementById(containerId);
  // Clear existing content
  container.innerHTML = "";
  // Ensure services is an array before trying to iterate over it
  if (Array.isArray(services)) {
    services.forEach((service) => {
      // Create a div for each service
      const bubble = document.createElement("div");
      bubble.classList.add("service-bubble");
      bubble.textContent = service.service_name;
      bubble.dataset.serviceId = service.service_id;

      // Handle click event
      bubble.addEventListener("click", function () {
        if (isMainService) {
          // Deselect all other main service bubbles
          const selected = container.querySelector(".selected");
          if (selected) {
            selected.classList.remove("selected");
          }
        }
        // Toggle the selected class
        bubble.classList.toggle("selected");
      });

      container.appendChild(bubble);
    });
  } else {
    console.error(
      "populateServiceBubbles was called with a non-array services argument:",
      services
    );
  }
}

// Event listeners for tooltip
function showTooltip(element, message) {
  const rect = element.getBoundingClientRect();
  tooltip.textContent = message;
  tooltip.style.top = rect.bottom + "px";
  tooltip.style.left = rect.left + "px";
  tooltip.classList.remove("hidden");
}

function hideTooltip() {
  tooltip.classList.add("hidden");
}


export default {
  loadBookingPage,
  populateServices,
  populateBarbers,
  setupBookingForm,
  handleBarberChange,
  fetchUnavailableDates,
  initializeCalendar,
  handleDateClick,
  handleBookingSubmit,
  populateServiceBubbles,
};
