# FINDINGS

For every issue you discover, add a row: where it was, why it stopped the rules being met, and how you fixed it.
Write in your own words (1-2 lines each). Add as many rows as you need.

| Task | Where (file / line) | Why it stopped the rules being met | How I fixed it |
|------|---------------------|------------------------------------|----------------|
| T1   | `frontend/src/utils/format.js` (Lines 2-8), `EventCard.jsx` (Lines 1-9), `EventsPage.jsx` (Line 10) | Unimplemented date/duration formatting, assignment operator in `isFull` (`seatsLeft = 0`), prop mismatch (`seats` vs `seatsLeft`), and duplicate `key={e.title}` causing React console warnings. | Implemented `formatDate` and `formatDuration`, fixed `count === 0` check, passed `seatsLeft` prop, and used unique `key={e.id}`. |
| T2   | `frontend/src/components/NavBar.jsx` (Line 7), `frontend/src/pages/RegisterPage.jsx` (Lines 12-17, 22-35) | Register link pointed to `/registration` (broken route), state mutated directly (`regs.push`), no empty validation, no seat depletion tracking, no 3-registration limit, no 20% discount for `@charusat.edu.in`, and no cancellation support. | Linked to `/register`, added `/registration` route alias, managed state immutably, added input validations & error messages, implemented 20% discount, dynamic seat tracking, and registration cancellation. |
| T3   | `frontend/src/pages/OrganisersPage.jsx` (Lines 10-18, 25) | `fetch()` executed directly in render body without `useEffect` causing infinite loop, missing `return` on `res.json()`, no A-Z sorting, no organiser count, and missing error/retry handling. | Wrapped fetch in `useEffect`, handled errors gracefully with `"Could not load organisers"` and Retry button, sorted A-Z case-insensitively, and displayed `"<n> organisers"`. |
| T4   | `backend/app.js` (Lines 11-15, 29, 34-41) | Global error middleware placed before routes, `req.params.id` string comparison with number `id`, reversed & incomplete POST validation, missing `?maxFee` filter, and missing DELETE route. | Moved error middleware after all routes, parsed `req.params.id` to Number, added title/capacity/fee validation in POST, added `?maxFee` filtering in GET, and implemented DELETE route. |
| T5   | `backend/models/Event.js` (Lines 4, 5, 18), `backend/utils/formatError.js` (Lines 3-5), `backend/seed.js` (Lines 8-10) | Misspelled `require` instead of `required`, `date` typed as String instead of Date, `createdAt` set to static `Date.now()`, `formatValidationError` returning raw error, and unimplemented seed script. | Corrected `required` and `Date` type, set `createdAt` default to `Date.now`, mapped Mongoose errors to `{ error, details: [{ field, message }] }`, implemented seed saving valid event and logging formatted error, and saved `evidence/db.png`. |

## T1 — The Event Listing (Components and Props)
- **What was wrong:**
  1. `frontend/src/utils/format.js` contained placeholder stub functions for `formatDate` and `formatDuration` that simply returned raw values without formatting.
  2. `frontend/src/components/EventCard.jsx` had a critical assignment bug `const isFull = seatsLeft = 0;` which assigned 0 to `seatsLeft` instead of performing equality comparison. It also rendered date and duration directly without formatting.
  3. `frontend/src/pages/EventsPage.jsx` passed `key={e.title}` where multiple events shared the title "Workshop" (id 2 and id 3), generating React console duplicate key warnings. Additionally, it passed prop `seats={e.seatsLeft}` while `EventCard` expected `seatsLeft`.
- **Why it mattered:**
  Dates and durations did not conform to the required formats `DD Mon YYYY` (e.g. "05 Nov 2026") and hour/minute strings omitting zero parts (e.g. "1 h 30 min", "45 min", "2 h"). The assignment operator in `EventCard` corrupted the `seatsLeft` variable, making cards report incorrect seat statuses. Duplicate keys raised React warnings in the browser console, directly violating Task 1 criteria.
- **How you fixed it:**
  - In `frontend/src/utils/format.js`, implemented `formatDate()` to convert date strings or Date objects into `DD Mon YYYY` format without timezone shifts.
  - Implemented `formatDuration()` to compute hours and minutes, omitting 0h or 0min parts (e.g., 90 -> "1 h 30 min", 45 -> "45 min", 120 -> "2 h").
  - In `frontend/src/components/EventCard.jsx`, imported and applied `formatDate` and `formatDuration`, fixed `count === 0` comparison, formatted fee as "Free" or `₹X.XX`, and rendered seat status as "Full" or `<n> seats left`.
  - In `frontend/src/pages/EventsPage.jsx`, updated the map key to `key={e.id}` and passed `seatsLeft={e.seatsLeft}`.

## T2 — The Registration (Routing and State)
- **What was wrong:**
  1. In `frontend/src/components/NavBar.jsx`, the Register link pointed to `/registration`, whereas `App.jsx` only declared route `/register`, causing navigation to a blank route.
  2. In `frontend/src/pages/RegisterPage.jsx`, registrations were added via direct array mutation `regs.push(...)` followed by `setRegs(regs)`, which does not change the array reference and prevents React from re-rendering.
  3. No validation existed for empty name or email fields.
  4. There was no tracking of seats remaining per event and no validation to prevent registering for full events.
  5. There was no restriction limiting registrations per email address to a maximum of 3.
  6. The 20% discount for `@charusat.edu.in` email addresses was unimplemented.
  7. The page lacked the required dynamic displays for "Seats left: <n>" and "Total payable: ₹<amount>", as well as the ability to cancel registrations.
- **Why it mattered:**
  Users could not navigate between views seamlessly without route mismatches. Registrations failed to update the UI predictably. The system permitted invalid submissions, allowed overbooking past capacity, allowed excessive bookings per email, failed to calculate correct discounted student fees, and gave users no way to cancel bookings or view accurate totals.
- **How you fixed it:**
  - Updated `NavBar.jsx` with `<Link to="/register">` and supported both `/register` and `/registration` in `App.jsx`.
  - In `RegisterPage.jsx`, ensured immutable state updates via `setRegs([...regs, newRegistration])`.
  - Added validation displaying `"Name and email are required"` when either name or email is blank.
  - Calculated remaining seats for the selected event dynamically (`selectedEvent.seatsLeft - countOfBookingsForEvent`), refusing registration with `"Event is full"` when no seats are available.
  - Enforced a 3-registration limit per email address with error message `"Limit of 3 registrations reached"`.
  - Implemented fee calculation giving an automatic 20% discount (paying 80% of fee) for emails ending in `@charusat.edu.in`.
  - Displayed `"Seats left: <n>"`, `"Total payable: ₹<amount>"`, and added a Cancel button next to each registration that removes the registration, restores the seat count, and adjusts the total payable amount.

## T3 — The Organisers Directory (API Consumption)
- **What was wrong:**
  1. In `frontend/src/pages/OrganisersPage.jsx`, the `fetch(URL)` call was executed directly inside the component body without `useEffect`, executing on every render and triggering an infinite loop of network requests and re-renders.
  2. Inside the fetch promise chain, `res.json()` was called inside curly braces without a `return` statement, causing `setData(undefined)`.
  3. Organisers were not sorted alphabetically A-Z.
  4. The required `<n> organisers` count was missing.
  5. Network errors or non-200 HTTP responses were not handled cleanly with a retry button.
- **Why it mattered:**
  The component entered an infinite fetch storm, causing browser freezing and rate limiting. Even on successful response, `data` was set to `undefined`, breaking list rendering. Unhandled errors caused unhandled promise rejections, leaving users stuck without a way to retry without reloading the page.
- **How you fixed it:**
  - Encapsulated data fetching inside a `useEffect` hook with dependency array `[]` so the request triggers exactly once on component mount.
  - Handled network errors and non-200 responses safely inside try/catch, setting error state without unhandled exceptions.
  - Rendered `"Loading organisers…"` during loading state.
  - Displayed `"Could not load organisers"` with a `Retry` button on error to re-trigger the fetch without full page reload.
  - On successful response, sorted organisers alphabetically A–Z case-insensitively using `.toLowerCase().localeCompare()`, displayed `"<n> organisers"`, and rendered each organiser's name, company name, and email.

## T4 — The Events Service (Express and Middleware)
- **What was wrong:**
  1. In `backend/app.js`, the global error handler `app.use((err, req, res, next) => ...)` was placed before the route handlers. In Express, error handling middleware must be placed after all routes; otherwise, downstream errors (such as those thrown by `/api/v1/boom`) bypass the handler.
  2. In `GET /api/v1/events/:id`, event lookup used `e.id === req.params.id`. Since `e.id` is a number and `req.params.id` is a string, strict equality always returned `false`.
  3. `POST /api/v1/events` had inverted validation (`if (title) return res.status(400)`), failed to trim title or enforce the 1-80 character limit, did not validate capacity as a whole number from 1 to 500, and did not check for non-negative fees.
  4. `GET /api/v1/events` lacked support for the `?maxFee=n` query parameter.
  5. The `DELETE /api/v1/events/:id` route handler was completely missing.
- **Why it mattered:**
  Unhandled errors (like `/api/v1/boom`) leaked default Express stack traces or crashed the server instead of returning a clean 500 JSON object. Event lookups by ID always returned 404. Invalid POST payloads were accepted while valid ones were rejected. Clients could not filter events by maximum fee or delete events.
- **How you fixed it:**
  - Relocated the global error handling middleware to the bottom of `backend/app.js`, ensuring all unhandled errors respond with status 500 and `{ error: "Something went wrong" }` without stack trace leakage.
  - Verified request logger middleware logs each request in the format `[METHOD] [PATH] [TIMESTAMP]`.
  - Parsed `req.params.id` to `Number(req.params.id)` in GET and DELETE handlers.
  - Implemented thorough input validation on `POST /api/v1/events` (trimmed title 1-80 chars, whole number capacity 1-500, fee >= 0 with default 0), returning status 400 on error and 201 on success.
  - Implemented `?maxFee=n` query filtering in `GET /api/v1/events`.
  - Implemented `DELETE /api/v1/events/:id` returning 200 on successful deletion and 404 when not found.

## T5 — The Event Data (MongoDB and Mongoose)
- **What was wrong:**
  1. In `backend/models/Event.js`, the `title` field used `require: [true, ...]` instead of `required: [true, ...]`, so Mongoose ignored the requirement rule.
  2. The `date` field was typed as `String` rather than `Date`, allowing invalid date strings like `"banana"` to pass validation.
  3. `createdAt` used `default: Date.now()` which evaluated the timestamp once when the Node module was loaded, giving all documents created during runtime the same creation timestamp.
  4. In `backend/utils/formatError.js`, `formatValidationError` was an incomplete stub returning the raw error object rather than a sanitized plain object.
  5. `backend/seed.js` was a placeholder without database seeding or validation error logging.
- **Why it mattered:**
  Invalid event documents (e.g. missing titles or invalid dates) could be persisted to the database. All documents shared identical creation timestamps. Validation errors exposed internal Mongoose exception structures rather than a standardized, client-friendly error format. Seeding functionality was unusable.
- **How you fixed it:**
  - Corrected `require` to `required` on `title` and set `date` type to `Date` in `Event.js`.
  - Changed `createdAt` default to `Date.now` (the function reference), ensuring each document evaluates its own timestamp upon creation.
  - Implemented `formatValidationError(err)` to transform Mongoose `ValidationError` into a plain object `{ error: "Validation failed", details: [ { field, message }, ... ] }`.
  - Implemented `backend/seed.js` to connect to MongoDB, save one valid event document, attempt to validate an invalid event, format its error using `formatValidationError`, and print the result.
  - Added database document evidence screenshot at `evidence/db.png`.
