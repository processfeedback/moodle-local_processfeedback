# Process Feedback Local Moodle Plugin

Process Feedback Local Moodle plugin is a student-centered writing process tracking tool for Moodle assignments and forums. It records edits in students’ browsers, storing them locally in the browser's database. 

The primary purpose of the plugin is to allow students to generate writing process reports so they can explore and reflect on their writing process or share it with their peers or teacher.

## Features

- Injects the Process Feedback browser app on Moodle assignment and forum pages.
- Detects supported editors in Moodle and stores edit history while a student types.
- Saves edit history data, including paste activity, locally, in the students’ browser database, IndexedDB.
- Shows teacher-facing notices on enabled assignment and forum pages so they are reminded.
- Shows students a Process Feedback panel indicating that their edits are tracked.
- Allows students to download process data for opening writing process reports.
- Allows students to open a writing process report in a new tab in the Process Feedback web application.
- Optionally allows teachers to open a student-submitted writing process report in a new tab in the Process Feedback web application when the companion `assignsubmission_processfeedback` assignment submission plugin is present.
- Provides a Writing Process Dashboard (beta feature — not thoroughly tested) that lets teachers open all submitted writing process reports on an assignment grading page together in the Process Feedback web application.

## How it works

The local plugin runs entirely in the browser and is responsible for tracking and packaging the writing process.

1. On assignment and forum activity pages, the plugin injects the Process Feedback app and loads its JavaScript (the `local_processfeedback/main` module). It activates only when:

    - the activity type (assignment or forum) is enabled for that course, and
    - the user has the `local/processfeedback:use` capability.

2. Once active, it detects the supported Moodle editor on the page and records edits and paste activity as the student types. Tracked process data is stored locally in the student's browser using IndexedDB and stays there unless the student exports it or it is uploaded during assignment submission.

3. The plugin adds a Process Feedback panel to the page, from which a student can:

    - download the tracked process data as a ZIP file, or
    - open their writing process report directly in the Process Feedback web application in a new tab.
    
    Opening a report sends the selected process data to the external Process Feedback web application for report generation and viewing.

4. On the assignment grading page, teachers see controls to open student-submitted writing process reports in the web application. This relies on the companion `assignsubmission_processfeedback` plugin having stored those reports (see below).

5. Teachers are shown notices on enabled assignment and forum pages, both when viewing the activity and when editing its settings, so they know Process Feedback is active. Students see the panel itself, which explains that their edits are tracked on their device.

Because tracking and export happen entirely in the browser, the plugin is useful on its own for browser-local tracking and manual ZIP export. Automatic submission into Moodle assignments is an optional integration, described next.

## Optional assignment integration

Automatic assignment submission, which can be achieved through a separate plugin, is an optional integration. The local plugin does not depend on the companion plugin. It runs on its own for tracking edit history in students' browsers.

For the complete assignment workflow, the two plugins divide the work.

`local_processfeedback` is the **producer and viewer**:

- records writing data and paste activity in the browser;
- packages a ZIP export in the assignment form before Moodle submits it;
- uploads those files to Moodle's draft file area during submission;
- allows students to download the process data as a ZIP file;
- allows students to open their writing process report in the web application.

`assignsubmission_processfeedback` is the **receiver, persister, and viewer**:

- exposes the hidden draft field on the assignment form;
- receives the uploaded draft files during assignment save;
- moves them into permanent assignment submission storage;
- shows saved process data links to teachers.

In practical terms:

- both plugins are required for the complete assignment submission feature
- the local plugin can run by itself for tracking edit history in students' browsers and exporting process data
- the companion plugin declares a hard dependency on `local_processfeedback`, so Moodle will not install it unless this local plugin is already present

## Requirements

- Moodle 5.0+ (`$plugin->requires = 2025041400`)
- JavaScript and IndexedDB enabled in the student’s browser

Current release: `0.1.0-m1` alpha.

## Installation

### Download

You can download the latest packaged release, `local_processfeedback.zip`, from the [Github Releases page](https://github.com/processfeedback/moodle-local_processfeedback/releases).

### Steps

1. Download the plugin ZIP (see above).
2. Copy or extract the ZIP into `<moodleroot>/local`; it contains a single `processfeedback` folder.
3. Visit `Site administration > Notifications` to complete the Moodle upgrade.
4. Go to `Site administration > Plugins > Local plugins > Process Feedback`.
5. Enter the course IDs for which to enable Process Feedback in assignments and/or forums, then save the settings.
6. For automatic assignment submission, also install the companion `assignsubmission_processfeedback` plugin.

## Settings

- **Courses allowing Process Feedback in assignments**: enables assignment support for specific Moodle course IDs. Leave empty to disable Process Feedback on assignments in all courses.
- **Courses allowing Process Feedback in forums**: enables forum support for specific Moodle course IDs. Leave empty to disable Process Feedback on forums in all courses.
- **Course settings**: the plugin creates managed course custom fields for assignment and forum enablement. Saving the site course-ID settings syncs those values into the matching course fields, and saving a course syncs the course values back into the site allow-lists.
- **Activity availability**: Process Feedback runs only when the activity module is supported, the course is enabled for that module, and the user has the required capability.

## Capabilities

- `local/processfeedback:configure`: configure site settings.
- `local/processfeedback:use`: use Process Feedback in supported module contexts.
- `local/processfeedback:viewreports`: view Process Feedback reports.

## Privacy

- This is a local-first plugin. It collects and stores student data as they type in their own device. Data is shared only when either students explicitly share their work or submit their work when auto-submission is enabled.
- This plugin stores students' personal writing process data in their browser, by default. Data is not automatically collected or stored in Moodle database tables or elsewhere on every edit.
- Student exported process data ZIP or shared writing process reports contain personal data.
- Student-submitted process data is stored and exported by the companion assignment submission plugin.
- Writing process data should be handled with permission from the author and following the student’s institution's privacy and retention policies.

## Development

Build AMD JavaScript with:

```bash
npm install
npm run build
```

## Issues

Report bugs and feature requests on our [contact page](https://processfeedback.org/contact/).

## License

This plugin is licensed under the GNU GPL v3 or later. See [LICENSE](LICENSE).

Bundled third-party libraries are listed in [thirdpartylibs.xml](thirdpartylibs.xml).

## Research citation

Adhikari, Badri; "Thinking Beyond Chatbots' Threat to Education: Visualizations to Elucidate the Writing or Coding Process"; [Education Sciences](https://www.mdpi.com/2227-7102/13/9/922); 2023. 

## More information

Learn more about the plugin on the [Process Feedback website](https://processfeedback.org/moodle-plugin/).
