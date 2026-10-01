# Process Feedback Local changes

## 0.5.2 - 2026-10-01

- Uploads submission process data through Moodle's standard upload repository (`repository_ajax.php`) instead of the
  custom `upload.php` endpoint, so Moodle applies its upload size limits, draft area limits and antivirus scan.
  `assignsubmission_processfeedback` 0.5.2 validates the files again before saving them. Requires the site's
  "Upload a file" repository to be enabled.
- Builds AMD modules with Moodle's standard Grunt pipeline (minified files with source maps); removes the custom
  `Gruntfile.js` and npm packaging files.
- Removes the browser `localStorage` switch that skipped the process-data upload.
- Logs through Moodle's `core/log` (debug output follows the site's developer debugging setting) instead of
  `localStorage` debug switches and direct `console` calls.
- Removes the unused `local/processfeedback:configure` capability and the empty course navigation callback.
- Declares supported Moodle branches (4.4 onwards) in `version.php`.
- Adds missing boilerplate headers and fixes Moodle coding style issues.
- Keeps keyboard focus inside the export dialog while an action runs: the action buttons use `aria-disabled` instead
  of `disabled` (disabling the focused button dropped focus to the page), and focus returns to the dialog if it lands
  outside it, for example when returning from another browser tab.
- "Open report" opens the new tab directly on the Process Feedback page, which loads while the data is prepared,
  instead of a blank tab.
- Makes the Process Feedback link in the export dialog's download message look like a link.
- Stops calculating the largest change metric in the process summary.
- Adds moodle-plugin-ci GitHub Actions workflow.

## 0.5.1 - 2026-09-24

- Marks the plugin as stable (previously alpha).

## 0.5.0 - 2026-09-20

- Release of the `local_processfeedback` Moodle local plugin.
- Adds a fallback panel placement target for assignment submission status tables.
- Opens the student panel link in a new tab.
- Points ProcessFeedback explorer URLs at the production environment.
- Removes the export details heading from the panel.

## 0.1.0-m1

- Initial alpha milestone for the `local_processfeedback` Moodle local plugin.
- Adds browser-local writing-process capture on supported Moodle activity pages.
- Adds ZIP export support for captured revision data.
- Adds admin settings, capabilities, privacy metadata, and AMD build assets.
- Adds optional integration for Assignment submission when a compatible submission plugin is present.