# EduSubmit – Cloud-Based Student Assignment Submission & Feedback Portal

EduSubmit is a cloud-based academic assignment management portal developed as a Cloud Computing course project.

The system provides separate workspaces for **students and teachers** to manage assignments, submissions, deadlines, marks, and feedback using Firebase cloud services.

---

## 🚀 Live Application

https://edusubmit-281e2.web.app

## 💻 GitHub Repository

https://github.com/vyshnaviporandla/EduSubmit-Cloud-Assignment-Portal

---

## 📌 Project Overview

EduSubmit demonstrates how cloud computing concepts can be applied to a real academic workflow.

### Student can:

- Register and log in
- View available assignments
- View assignment descriptions
- View deadlines
- Select PDF/DOCX assignment files
- Submit assignments
- Track submission status
- See On-Time / Late status
- View marks
- View teacher feedback

### Teacher can:

- Register and log in
- Create assignments
- Set assignment descriptions
- Set deadlines
- Set maximum marks
- View student submissions
- Identify late submissions
- Grade assignments
- Provide feedback

---

## ☁️ Cloud Computing Concepts

This project demonstrates:

- Cloud Authentication
- Cloud Database
- Cloud Hosting
- Role-Based Access Control
- Cloud Service Integration
- Server Timestamps
- Deadline Tracking
- Cloud Application Architecture
- Scalability concepts
- Version Control
- Cloud Deployment

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend application |
| Vite | Frontend build tool |
| Firebase Authentication | User authentication |
| Cloud Firestore | Cloud database |
| Firebase Hosting | Web application hosting |
| Firestore Security Rules | Database security |
| Git | Version control |
| GitHub | Source code and proof of work |

---

## 🏗️ System Architecture

```text
                  ┌─────────────────────┐
                  │       User          │
                  │ Student / Teacher   │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   React Frontend    │
                  │      + Vite         │
                  └──────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌─────────────┐
       │  Firebase  │ │  Firestore │ │   Firebase  │
       │    Auth    │ │  Database  │ │   Hosting   │
       └────────────┘ └─────┬──────┘ └─────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Firestore Security  │
                  │       Rules         │
                  └─────────────────────┘
```
## User Roles
### Student

Students can:

Create an account
Log in
View assignments
View deadlines
Select PDF/DOCX files
Submit assignments
Track submission status
View marks
View teacher feedback

###  Teacher

Teachers can:

Create an account
Log in
Create assignments
Set deadlines
Set maximum marks
View student submissions
Identify late submissions
Enter marks
Provide feedback

## Submission Status

EduSubmit automatically tracks assignment status.

Condition	Status
Assignment not submitted and deadline is active	Pending
Assignment not submitted after deadline	Overdue
Submitted before deadline	On Time
Submitted after deadline	Late
Teacher has entered marks	Graded
🗄️ Firestore Database Structure
profiles

Stores user information.
```text
profiles
 └── userId
      ├── name
      ├── email
      ├── role
      └── createdAt
    ```
courses

Stores course information.
```text
courses
 └── courseId
      ├── name
      └── code
assignments
```
Stores teacher-created assignments.
```text
assignments
 └── assignmentId
      ├── title
      ├── description
      ├── dueDate
      ├── maxMarks
      ├── createdBy
      └── createdAt
```

submissions
Stores student submission information.
```text
submissions
 └── submissionId
      ├── assignmentId
      ├── assignmentTitle
      ├── studentId
      ├── studentName
      ├── studentEmail
      ├── fileName
      ├── fileType
      ├── fileSize
      ├── fileUrl
      ├── status
      ├── submissionStatus
      ├── marks
      ├── feedback
      └── submittedAt
```
## Security

Firestore Security Rules provide role-based access control.

Students

Students can:

Read appropriate assignments
Read their own submissions
Create submissions for themselves

Students cannot:

Modify another student's submission
Grade submissions
Delete submissions
Create or modify assignments
Teachers

Teachers can:

Read assignments
Create assignments
Update assignments
Delete assignments
Read student submissions
Grade submissions
Provide feedback

Submission deletion is disabled in the current implementation.

## Project Structure
```text
EduSubmit/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── firebase.js
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .firebaserc
├── .gitignore
└── README.md
```
## Local Setup
1. Clone the repository
```text
git clone https://github.com/vyshnaviporandla/EduSubmit-Cloud-Assignment-Portal.git
```
2. Open the project
   ```text
cd EduSubmit-Cloud-Assignment-Portal
```
3. Open frontend
```text
cd frontend
```
4. Install dependencies
```text
npm install
```
5. Start development server
```text
npm run dev
```
The application will be available through the local Vite development URL shown in the terminal.

## Firebase Configuration

The project uses Firebase services for:

Authentication
      ↓
Cloud Firestore
      ↓
Security Rules
      ↓
Firebase Hosting

The Firebase project used for deployment is:

edusubmit-281e2

## Build for Production

Inside the frontend directory:
```text
npm run build
```
The production build is generated in:
```text
frontend/dist/
```
## Firebase Deployment

From the project root:
```text
firebase deploy --only hosting
```
To deploy Firestore security rules:
```text
firebase deploy --only firestore:rules
```
## Testing

The following functionality should be tested:

 Student registration
 Student login
 Teacher registration
 Teacher login
 Teacher creates assignment
 Student sees assignment
 Student selects PDF/DOCX
 Student submits assignment
 On-Time status
 Late status
 Overdue status
 Teacher sees submission
 Teacher enters marks
 Teacher provides feedback
 Student sees marks
 Student sees feedback
 Firestore security rules
 Firebase Hosting
 
## Cloud Concepts Demonstrated
1. Cloud Authentication

Firebase Authentication provides managed user authentication.

2. Cloud Database

Cloud Firestore stores application data remotely.

3. Cloud Hosting

Firebase Hosting makes the application available through the internet.

4. Role-Based Access Control

Firestore Security Rules provide different permissions for students and teachers.

5. Server Timestamps

Firestore server timestamps are used for important application events such as creation, submission and grading.

6. Scalability

The application uses managed Firebase services rather than requiring the project team to maintain physical servers.

7. Version Control

Git and GitHub maintain the source code and development history.

## Current Limitation

The current version intentionally does not use Firebase Cloud Storage for actual file uploads.

The application:

Validates PDF/DOCX files
Checks file size
Records file metadata
Stores submission information in Firestore

However, the actual file binary is not uploaded to Firebase Storage.

Firebase Storage was not enabled because the current project is being developed with a no-paid-cloud preference.

Future versions can add object storage for actual file upload and download.

## Future Enhancements

Possible future improvements include:

Actual cloud file uploads
Secure file downloads
Course enrollment
Teacher course management
Email notifications
Assignment deadline reminders
Student performance analytics
Teacher analytics dashboard
Automated CI/CD deployment
Server-side deadline enforcement
Improved administrative controls

## Project Highlights
Student Workflow
Login
  ↓
Dashboard
  ↓
View Assignment
  ↓
Select File
  ↓
Submit
  ↓
On Time / Late
  ↓
View Marks & Feedback
Teacher Workflow
Login
  ↓
Teacher Dashboard
  ↓
Create Assignment
  ↓
Set Deadline
  ↓
View Submissions
  ↓
Grade
  ↓
Provide Feedback

 ## Deployment
Live Website
```text
https://edusubmit-281e2.web.app
```
GitHub
```text

https://github.com/vyshnaviporandla/EduSubmit-Cloud-Assignment-Portal
```
##  Project Documentation

Detailed project documentation is available in:

EduSubmit_Project_Documentation.pdf

The documentation covers:

Project overview
Architecture
Technology stack
Database design
Security
Deadline logic
Cloud concepts
Testing
Limitations
Future enhancements

##  Project Status
Frontend              ✅ Completed
Authentication        ✅ Completed
Cloud Firestore       ✅ Completed
Assignment Creation   ✅ Completed
Submission Tracking   ✅ Completed
Deadline Logic        ✅ Completed
Teacher Grading       ✅ Completed
Feedback              ✅ Completed
Security Rules        ✅ Deployed
Firebase Hosting      ✅ Deployed
GitHub                 ✅ Completed
Cloud Storage          ⏳ Future Enhancement

## Conclusion

EduSubmit demonstrates how cloud technologies can be used to build a practical academic application.

The project combines:

React + Firebase Authentication + Cloud Firestore + Firebase Hosting + Firestore Security Rules + GitHub

to create a complete cloud-connected assignment management workflow.

## Acknowledgement

This project was developed as part of a Cloud Computing course project to gain practical experience with cloud application development, Firebase services, security rules, deployment and version control.
