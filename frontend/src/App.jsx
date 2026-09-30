import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import "./App.css";

/* =========================================================
   APP
========================================================= */

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setCourses([]);
        setAssignments([]);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      try {
        const profileRef = doc(db, "profiles", currentUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile({
            id: currentUser.uid,
            ...profileSnap.data(),
          });
        }

        await loadData(currentUser.uid);
      } catch (error) {
        console.error("Loading error:", error);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function loadData(uid) {
    try {
      const courseSnapshot = await getDocs(collection(db, "courses"));

      setCourses(
        courseSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );

      const assignmentQuery = query(
        collection(db, "assignments"),
        orderBy("dueDate", "asc")
      );

      const assignmentSnapshot = await getDocs(assignmentQuery);

      const assignmentData = assignmentSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setAssignments(assignmentData);

      const submissionSnapshot = await getDocs(
        collection(db, "submissions")
      );

      const allSubmissions = submissionSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const userSubmissions =
        profile?.role === "teacher"
          ? allSubmissions
          : allSubmissions.filter((item) => item.studentId === uid);

      setSubmissions(userSubmissions);
    } catch (error) {
      console.error("Data loading error:", error);

      // Fallback without orderBy if an index is required.
      try {
        const assignmentSnapshot = await getDocs(
          collection(db, "assignments")
        );

        setAssignments(
          assignmentSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    }
  }

  async function refreshData() {
    if (user) {
      await loadData(user.uid);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <h2>Loading your workspace...</h2>
          <p>Please wait while EduSubmit connects to the cloud.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar profile={profile} onLogout={handleLogout} />

      <main className="main-content">
        <TopBar profile={profile} />

        {profile.role === "teacher" ? (
          <TeacherDashboard
            profile={profile}
            courses={courses}
            assignments={assignments}
            submissions={submissions}
            refreshData={refreshData}
          />
        ) : (
          <StudentDashboard
            profile={profile}
            courses={courses}
            assignments={assignments}
            submissions={submissions}
            refreshData={refreshData}
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   AUTH
========================================================= */

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }

        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await setDoc(doc(db, "profiles", result.user.uid), {
          name: name.trim(),
          email,
          role,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);

      let message = "Something went wrong.";

      if (err.code === "auth/invalid-credential") {
        message = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        message = "This email is already registered.";
      } else if (err.code === "auth/weak-password") {
        message = "Password should contain at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-background-shape shape-one"></div>
      <div className="auth-background-shape shape-two"></div>

      <div className="auth-wrapper">
        <div className="auth-brand">
          <div className="brand-logo large">E</div>

          <div>
            <h1>EduSubmit</h1>
            <p>Cloud Assignment Portal</p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">
              {mode === "login" ? "WELCOME BACK" : "GET STARTED"}
            </span>

            <h2>
              {mode === "login"
                ? "Sign in to your workspace"
                : "Create your account"}
            </h2>

            <p>
              {mode === "login"
                ? "Manage assignments, submissions and feedback in one place."
                : "Join your academic workspace and start managing assignments."}
            </p>
          </div>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="form-group">
                <label>Full name</label>

                <div className="input-wrapper">
                  <span>👤</span>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email address</label>

              <div className="input-wrapper">
                <span>✉</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>

              <div className="input-wrapper">
                <span>🔒</span>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label>Account type</label>

                <div className="role-selector">
                  <button
                    type="button"
                    className={role === "student" ? "selected" : ""}
                    onClick={() => setRole("student")}
                  >
                    <span>🎓</span>
                    Student
                  </button>

                  <button
                    type="button"
                    className={role === "teacher" ? "selected" : ""}
                    onClick={() => setRole("teacher")}
                  >
                    <span>👨‍🏫</span>
                    Teacher
                  </button>
                </div>
              </div>
            )}

            <button
              className="primary-auth-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}

              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="auth-switch">
            <span>
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>

            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>

        <p className="auth-footer">
          Powered by Firebase Cloud Services
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ profile, onLogout }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="brand-logo">E</div>

          <div>
            <strong>EduSubmit</strong>
            <span>Academic Cloud</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>

          <div className="nav-item active">
            <span>▦</span>
            Dashboard
          </div>

          <div className="nav-item">
            <span>▤</span>
            Assignments
          </div>

          <div className="nav-item">
            <span>◫</span>
            Submissions
          </div>

          <div className="nav-item">
            <span>◷</span>
            Deadlines
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">CLOUD</span>

          <div className="cloud-status">
            <div className="status-dot"></div>

            <div>
              <strong>Cloud connected</strong>
              <span>Firebase services</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="profile-mini">
          <div className="avatar">
            {profile.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="profile-mini-info">
            <strong>{profile.name || "User"}</strong>
            <span>{profile.role}</span>
          </div>
        </div>

        <button className="sidebar-logout" onClick={onLogout}>
          <span>↪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   TOP BAR
========================================================= */

function TopBar({ profile }) {
  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">
          Workspace <span>/</span> Dashboard
        </div>

        <h1>
          Good {getGreeting()}, {profile.name?.split(" ")[0] || "there"} 👋
        </h1>
      </div>

      <div className="topbar-user">
        <div className="notification">🔔</div>

        <div className="topbar-avatar">
          {profile.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <div className="topbar-user-info">
          <strong>{profile.name}</strong>
          <span>
            {profile.role === "teacher" ? "Teacher" : "Student"}
          </span>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   STUDENT DASHBOARD
========================================================= */

function StudentDashboard({
  profile,
  courses,
  assignments,
  submissions,
  refreshData,
}) {
  const submittedIds = new Set(
    submissions.map((submission) => submission.assignmentId)
  );

  const pendingAssignments = assignments.filter(
    (assignment) => !submittedIds.has(assignment.id)
  );

  const gradedSubmissions = submissions.filter(
    (submission) =>
      submission.marks !== undefined &&
      submission.marks !== null &&
      submission.marks !== ""
  );

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="hero-badge">STUDENT WORKSPACE</span>

          <h2>Your academic workspace</h2>

          <p>
            Track assignments, submit your work and review teacher
            feedback from one cloud-based dashboard.
          </p>
        </div>

        <div className="hero-illustration">
          <div className="hero-icon">🎓</div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon="📚"
          label="Courses"
          value={courses.length}
          tone="blue"
        />

        <StatCard
          icon="📝"
          label="Assignments"
          value={assignments.length}
          tone="purple"
        />

        <StatCard
          icon="📤"
          label="Submitted"
          value={submissions.length}
          tone="green"
        />

        <StatCard
          icon="⭐"
          label="Graded"
          value={gradedSubmissions.length}
          tone="orange"
        />
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h2>Student dashboard</h2>
        </div>

        <button className="refresh-button" onClick={refreshData}>
          ↻ Refresh
        </button>
      </div>

      <div className="dashboard-grid">
        <section className="panel large-panel">
          <PanelHeader
            title="Available assignments"
            subtitle="Assignments shared by your teachers"
            icon="📝"
          />

          {assignments.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No assignments yet"
              text="New assignments will appear here."
            />
          ) : (
            assignments.map((assignment) => (
              <StudentAssignment
                key={assignment.id}
                assignment={assignment}
                submitted={submittedIds.has(assignment.id)}
                refreshData={refreshData}
              />
            ))
          )}
        </section>

        <section className="panel">
          <PanelHeader
            title="My submissions"
            subtitle="Your recent assignment activity"
            icon="📤"
          />

          {submissions.length === 0 ? (
            <EmptyState
              icon="📄"
              title="Nothing submitted"
              text="Your submissions will appear here."
            />
          ) : (
            submissions
              .slice()
              .reverse()
              .slice(0, 5)
              .map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                />
              ))
          )}
        </section>
      </div>

      <section className="dashboard-grid lower-grid">
        <section className="panel">
          <PanelHeader
            title="Courses"
            subtitle="Your enrolled courses"
            icon="📚"
          />

          {courses.length === 0 ? (
            <EmptyState
              icon="📚"
              title="No courses"
              text="Courses will appear here once added."
            />
          ) : (
            courses.map((course) => (
              <div className="course-card" key={course.id}>
                <div className="course-icon">📘</div>

                <div>
                  <h3>{course.name || course.title || "Course"}</h3>

                  <p>
                    {course.code
                      ? `Course code: ${course.code}`
                      : "Academic course"}
                  </p>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <PanelHeader
            title="Upcoming deadlines"
            subtitle="Assignments waiting for you"
            icon="⏰"
          />

          {pendingAssignments.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="You're all caught up"
              text="There are no pending assignments."
            />
          ) : (
            pendingAssignments.slice(0, 5).map((assignment) => (
              <DeadlineItem
                key={assignment.id}
                assignment={assignment}
              />
            ))
          )}
        </section>
      </section>

      <section className="panel feedback-panel">
        <PanelHeader
          title="Feedback & marks"
          subtitle="Review feedback provided by your teachers"
          icon="💬"
        />

        {gradedSubmissions.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No feedback yet"
            text="Teacher feedback and marks will appear here after grading."
          />
        ) : (
          gradedSubmissions.map((submission) => (
            <div className="feedback-card" key={submission.id}>
              <div>
                <strong>
                  {submission.assignmentTitle || "Assignment"}
                </strong>

                <p>
                  {submission.feedback || "No written feedback provided."}
                </p>
              </div>

              <div className="marks-badge">
                {submission.marks}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}

/* =========================================================
   STUDENT ASSIGNMENT
========================================================= */

function StudentAssignment({
  assignment,
  submitted,
  refreshData,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!file) {
      setMessage("Please choose a PDF or DOCX file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("File size must be below 10 MB.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Only PDF and DOCX files are allowed.");
      return;
    }

    if (!auth.currentUser) return;

    setUploading(true);
    setMessage("");

    try {
      await addDoc(collection(db, "submissions"), {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title || "Assignment",
        studentId: auth.currentUser.uid,
        studentName: auth.currentUser.displayName || "",
        studentEmail: auth.currentUser.email,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: "",
        status: "Submitted",
        marks: null,
        feedback: "",
        submittedAt: serverTimestamp(),
      });

      setFile(null);
      setMessage("Assignment submitted successfully.");
      await refreshData();
    } catch (error) {
      console.error(error);
      setMessage("Submission failed. Please try again.");
    }

    setUploading(false);
  }

  return (
    <div className="assignment-card">
      <div className="assignment-main">
        <div className="assignment-icon">📝</div>

        <div className="assignment-info">
          <div className="assignment-title-row">
            <h3>{assignment.title || "Untitled assignment"}</h3>

            {submitted ? (
              <span className="status-pill submitted">
                ✓ Submitted
              </span>
            ) : (
              <span className="status-pill pending">
                Pending
              </span>
            )}
          </div>

          <p className="assignment-description">
            {assignment.description || "No description provided."}
          </p>

          <div className="assignment-meta">
            <span>
              📅{" "}
              {formatDate(
                assignment.dueDate
              )}
            </span>

            <span>
              🎯 {assignment.maxMarks || 100} marks
            </span>
          </div>
        </div>
      </div>

      {!submitted && (
        <div className="submission-area">
          <label className="file-picker">
            <span>📎</span>
            <span>
              {file ? file.name : "Choose PDF or DOCX"}
            </span>

            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />
          </label>

          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={uploading}
          >
            {uploading ? "Submitting..." : "Submit assignment"}
          </button>

          {message && (
            <div className="inline-message">{message}</div>
          )}
        </div>
      )}

      {submitted && (
        <div className="submitted-notice">
          <span>✓</span>
          Your submission has been recorded.
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TEACHER DASHBOARD
========================================================= */

function TeacherDashboard({
  profile,
  assignments,
  submissions,
  refreshData,
}) {
  return (
    <>
      <section className="dashboard-hero teacher-hero">
        <div>
          <span className="hero-badge">TEACHER WORKSPACE</span>

          <h2>Manage your classroom</h2>

          <p>
            Create assignments, monitor student submissions and
            provide marks and feedback.
          </p>
        </div>

        <div className="hero-illustration">
          <div className="hero-icon">👨‍🏫</div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon="📝"
          label="Assignments"
          value={assignments.length}
          tone="blue"
        />

        <StatCard
          icon="📤"
          label="Submissions"
          value={submissions.length}
          tone="purple"
        />

        <StatCard
          icon="⭐"
          label="Graded"
          value={
            submissions.filter(
              (item) =>
                item.marks !== undefined &&
                item.marks !== null &&
                item.marks !== ""
            ).length
          }
          tone="green"
        />

        <StatCard
          icon="☁️"
          label="Cloud status"
          value="Live"
          tone="orange"
        />
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">TEACHING CENTER</span>
          <h2>Teacher dashboard</h2>
        </div>

        <button className="refresh-button" onClick={refreshData}>
          ↻ Refresh
        </button>
      </div>

      <div className="dashboard-grid teacher-grid">
        <CreateAssignment onCreated={refreshData} />

        <section className="panel">
          <PanelHeader
            title="Your assignments"
            subtitle="Assignments currently available"
            icon="📝"
          />

          {assignments.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No assignments"
              text="Create your first assignment."
            />
          ) : (
            assignments.map((assignment) => (
              <div className="teacher-assignment" key={assignment.id}>
                <div className="teacher-assignment-icon">
                  📝
                </div>

                <div>
                  <strong>
                    {assignment.title || "Assignment"}
                  </strong>

                  <p>
                    Due {formatDate(assignment.dueDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <section className="panel feedback-panel">
        <PanelHeader
          title="Student submissions"
          subtitle="Review and grade submitted assignments"
          icon="📊"
        />

        {submissions.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No submissions yet"
            text="Student submissions will appear here."
          />
        ) : (
          submissions.map((submission) => (
            <TeacherSubmission
              key={submission.id}
              submission={submission}
              refreshData={refreshData}
            />
          ))
        )}
      </section>
    </>
  );
}

/* =========================================================
   CREATE ASSIGNMENT
========================================================= */

function CreateAssignment({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreate(event) {
    event.preventDefault();

    if (!title.trim() || !dueDate) {
      setMessage("Title and due date are required.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await addDoc(collection(db, "assignments"), {
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(dueDate),
        maxMarks: Number(maxMarks) || 100,
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });

      setTitle("");
      setDescription("");
      setDueDate("");
      setMaxMarks("100");

      setMessage("Assignment created successfully.");

      await onCreated();
    } catch (error) {
      console.error(error);
      setMessage("Could not create assignment.");
    }

    setLoading(false);
  }

  return (
    <section className="panel create-panel">
      <PanelHeader
        title="Create assignment"
        subtitle="Publish a new task for students"
        icon="＋"
      />

      <form onSubmit={handleCreate} className="assignment-form">
        <div className="form-group">
          <label>Assignment title</label>

          <input
            type="text"
            placeholder="Example: Cloud Computing Lab 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Description</label>

          <textarea
            rows="4"
            placeholder="Describe the assignment..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-two-column">
          <div className="form-group">
            <label>Due date</label>

            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Maximum marks</label>

            <input
              type="number"
              min="1"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
            />
          </div>
        </div>

        <button
          className="create-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create assignment"}
          {!loading && <span>→</span>}
        </button>

        {message && (
          <div className="inline-message">{message}</div>
        )}
      </form>
    </section>
  );
}

/* =========================================================
   TEACHER SUBMISSION
========================================================= */

function TeacherSubmission({
  submission,
  refreshData,
}) {
  const [marks, setMarks] = useState(
    submission.marks ?? ""
  );

  const [feedback, setFeedback] = useState(
    submission.feedback || ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveGrade() {
    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "submissions", submission.id), {
        marks: marks === "" ? null : Number(marks),
        feedback,
        status: marks === "" ? "Submitted" : "Graded",
        gradedAt: serverTimestamp(),
        gradedBy: auth.currentUser?.uid,
      });

      setMessage("Saved.");
      await refreshData();
    } catch (error) {
      console.error(error);
      setMessage("Could not save grade.");
    }

    setSaving(false);
  }

  return (
    <div className="grading-card">
      <div className="grading-header">
        <div className="student-info">
          <div className="student-avatar">
            {submission.studentName?.charAt(0)?.toUpperCase() ||
              submission.studentEmail?.charAt(0)?.toUpperCase() ||
              "S"}
          </div>

          <div>
            <strong>
              {submission.studentName ||
                submission.studentEmail ||
                "Student"}
            </strong>

            <span>
              {submission.assignmentTitle || "Assignment"}
            </span>
          </div>
        </div>

        <span
          className={`status-pill ${
            submission.marks !== null &&
            submission.marks !== undefined &&
            submission.marks !== ""
              ? "graded"
              : "pending"
          }`}
        >
          {submission.marks !== null &&
          submission.marks !== undefined &&
          submission.marks !== ""
            ? "Graded"
            : "Needs review"}
        </span>
      </div>

      <div className="submission-file">
        <span>📄</span>

        <div>
          <strong>{submission.fileName || "Submitted file"}</strong>
          <small>
            Submitted {formatDate(submission.submittedAt)}
          </small>
        </div>
      </div>

      <div className="grading-controls">
        <div className="form-group marks-input">
          <label>Marks</label>

          <input
            type="number"
            min="0"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="form-group feedback-input">
          <label>Feedback</label>

          <textarea
            rows="2"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write feedback for the student..."
          />
        </div>

        <button
          className="save-grade-button"
          onClick={saveGrade}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save grade"}
        </button>
      </div>

      {message && (
        <div className="inline-message">{message}</div>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle, icon }) {
  return (
    <div className="panel-header">
      <div className="panel-title-icon">{icon}</div>

      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function SubmissionCard({ submission }) {
  const graded =
    submission.marks !== null &&
    submission.marks !== undefined &&
    submission.marks !== "";

  return (
    <div className="submission-card">
      <div className="submission-card-icon">📄</div>

      <div className="submission-card-content">
        <strong>
          {submission.assignmentTitle || "Assignment"}
        </strong>

        <span>
          {submission.fileName || "Submitted document"}
        </span>

        <small>
          {formatDate(submission.submittedAt)}
        </small>
      </div>

      <span
        className={`mini-status ${
          graded ? "success" : "waiting"
        }`}
      >
        {graded ? `${submission.marks} marks` : "Submitted"}
      </span>
    </div>
  );
}

function DeadlineItem({ assignment }) {
  return (
    <div className="deadline-item">
      <div className="deadline-date">
        {getDay(assignment.dueDate)}
        <small>{getMonth(assignment.dueDate)}</small>
      </div>

      <div>
        <strong>{assignment.title || "Assignment"}</strong>

        <span>
          Due {formatDate(assignment.dueDate)}
        </span>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-logo">E</div>

        <div className="loading-spinner"></div>

        <h2>EduSubmit</h2>
        <p>Connecting to your cloud workspace...</p>
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";

  return "evening";
}

function convertTimestamp(value) {
  if (!value) return null;

  if (value?.toDate) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = convertTimestamp(value);

  if (!date) return "Not specified";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDay(value) {
  const date = convertTimestamp(value);

  if (!date) return "--";

  return date.getDate();
}

function getMonth(value) {
  const date = convertTimestamp(value);

  if (!date) return "---";

  return date.toLocaleString("en-IN", {
    month: "short",
  });
}