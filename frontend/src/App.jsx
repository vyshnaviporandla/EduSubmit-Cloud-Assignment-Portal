import { useEffect, useState } from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

function App() {
  // =============================
  // Authentication
  // =============================
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("student");

  // =============================
  // Application
  // =============================
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [selectedFiles, setSelectedFiles] = useState({});
  const [resubmitFiles, setResubmitFiles] = useState({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Teacher form
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentCourseId, setAssignmentCourseId] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState("");
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState("100");

  // =============================
  // Load authenticated user
  // =============================
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
          setProfile(profileSnap.data());
        }

        const coursesSnapshot = await getDocs(
          collection(db, "courses")
        );

        const coursesData = coursesSnapshot.docs.map((courseDoc) => ({
          id: courseDoc.id,
          ...courseDoc.data(),
        }));

        setCourses(coursesData);

        const assignmentsSnapshot = await getDocs(
          collection(db, "assignments")
        );

        const assignmentsData = assignmentsSnapshot.docs.map(
          (assignmentDoc) => ({
            id: assignmentDoc.id,
            ...assignmentDoc.data(),
          })
        );

        setAssignments(assignmentsData);

        // Student gets only own submissions.
        // Teacher gets all submissions.
        let submissionsData = [];

        const currentRole = profileSnap.exists()
          ? profileSnap.data().role
          : "student";

        if (currentRole === "teacher") {
          const submissionsSnapshot = await getDocs(
            collection(db, "submissions")
          );

          submissionsData = submissionsSnapshot.docs.map(
            (submissionDoc) => ({
              id: submissionDoc.id,
              ...submissionDoc.data(),
            })
          );
        } else {
          const submissionsQuery = query(
            collection(db, "submissions"),
            where("studentId", "==", currentUser.uid)
          );

          const submissionsSnapshot = await getDocs(
            submissionsQuery
          );

          submissionsData = submissionsSnapshot.docs.map(
            (submissionDoc) => ({
              id: submissionDoc.id,
              ...submissionDoc.data(),
            })
          );
        }

        setSubmissions(submissionsData);
      } catch (error) {
        console.error("Data loading error:", error);
        setMessage(error.message);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // =============================
  // Login / Registration
  // =============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        setMessage("Login successful!");
      } else {
        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

        const newUser = userCredential.user;

        await setDoc(
          doc(db, "profiles", newUser.uid),
          {
            uid: newUser.uid,
            name: name,
            email: newUser.email,
            role: accountType,
            createdAt: serverTimestamp(),
          }
        );

        setMessage(
          `${accountType === "teacher" ? "Teacher" : "Student"} registration successful!`
        );
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage(error.message);
    }
  };

  // =============================
  // Student file validation
  // =============================
  const validateFile = (file) => {
    if (!file) return false;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Only PDF and DOCX files are allowed.");
      return false;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("File size must be 10 MB or less.");
      return false;
    }

    return true;
  };

  // =============================
  // Student file selection
  // =============================
  const handleFileChange = (assignmentId, file) => {
    if (!validateFile(file)) return;

    setSelectedFiles((previous) => ({
      ...previous,
      [assignmentId]: file,
    }));

    setMessage("");
  };

  // =============================
  // Student submission
  // =============================
  const handleSubmission = async (assignment) => {
    if (!user) {
      setMessage("Please login first.");
      return;
    }

    const selectedFile = selectedFiles[assignment.id];

    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      const submissionId = `${assignment.id}_${user.uid}`;

      const submissionData = {
        assignmentId: assignment.id,
        studentId: user.uid,
        studentName: profile?.name || user.email,
        studentEmail: user.email,
        courseId: assignment.courseId,
        status: "submitted",
        submittedAt: serverTimestamp(),
        isLate: false,
        currentVersion: 1,
        fileName: selectedFile.name,
        fileUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "submissions", submissionId),
        submissionData,
        { merge: true }
      );

      const newSubmission = {
        id: submissionId,
        ...submissionData,
        submittedAt: {
          toDate: () => new Date(),
        },
      };

      setSubmissions((previous) => {
        const existing = previous.find(
          (item) => item.id === submissionId
        );

        if (existing) {
          return previous.map((item) =>
            item.id === submissionId
              ? { ...item, ...newSubmission }
              : item
          );
        }

        return [...previous, newSubmission];
      });

      setSelectedFiles((previous) => {
        const updated = { ...previous };
        delete updated[assignment.id];
        return updated;
      });

      setMessage(
        "Assignment submission recorded successfully!"
      );
    } catch (error) {
      console.error("Submission error:", error);
      setMessage(error.message);
    }
  };

  // =============================
  // Resubmission
  // =============================
  const handleResubmitFileChange = (
    submission,
    file
  ) => {
    if (!validateFile(file)) return;

    setResubmitFiles((previous) => ({
      ...previous,
      [submission.id]: file,
    }));

    setMessage("");
  };

  const handleResubmit = async (submission) => {
    if (!user) {
      setMessage("Please login first.");
      return;
    }

    const selectedFile = resubmitFiles[submission.id];

    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      const newVersion =
        (submission.currentVersion || 1) + 1;

      const versionId =
        `${submission.id}_v${newVersion}`;

      await setDoc(
        doc(db, "submissionVersions", versionId),
        {
          submissionId: submission.id,
          versionNumber: newVersion,
          fileName: selectedFile.name,
          fileUrl: "",
          submittedAt: serverTimestamp(),
          isLate: false,
        }
      );

      await setDoc(
        doc(db, "submissions", submission.id),
        {
          currentVersion: newVersion,
          fileName: selectedFile.name,
          fileUrl: "",
          status: "submitted",
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSubmissions((previous) =>
        previous.map((item) =>
          item.id === submission.id
            ? {
                ...item,
                currentVersion: newVersion,
                fileName: selectedFile.name,
                status: "submitted",
                submittedAt: {
                  toDate: () => new Date(),
                },
              }
            : item
        )
      );

      setResubmitFiles((previous) => {
        const updated = { ...previous };
        delete updated[submission.id];
        return updated;
      });

      setMessage(
        `Resubmission successful! Version ${newVersion} created.`
      );
    } catch (error) {
      console.error("Resubmission error:", error);
      setMessage(error.message);
    }
  };

  // =============================
  // TEACHER: Create assignment
  // =============================
  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    if (!assignmentTitle.trim()) {
      setMessage("Enter an assignment title.");
      return;
    }

    if (!assignmentCourseId) {
      setMessage("Select a course.");
      return;
    }

    if (!assignmentDueDate) {
      setMessage("Select a due date.");
      return;
    }

    try {
      const assignmentId =
        `assignment_${Date.now()}`;

      await setDoc(
        doc(db, "assignments", assignmentId),
        {
          title: assignmentTitle,
          description: assignmentDescription,
          courseId: assignmentCourseId,
          dueDate: new Date(assignmentDueDate),
          maxMarks: Number(assignmentMaxMarks) || 100,
          maxFileSizeMB: 10,
          allowedFileTypes: ["pdf", "docx"],
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        }
      );

      const course = courses.find(
        (item) => item.id === assignmentCourseId
      );

      setAssignments((previous) => [
        ...previous,
        {
          id: assignmentId,
          title: assignmentTitle,
          description: assignmentDescription,
          courseId: assignmentCourseId,
          dueDate: {
            toDate: () => new Date(assignmentDueDate),
          },
          maxMarks: Number(assignmentMaxMarks) || 100,
          maxFileSizeMB: 10,
          createdBy: user.uid,
        },
      ]);

      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentCourseId("");
      setAssignmentDueDate("");
      setAssignmentMaxMarks("100");

      setMessage(
        `Assignment created successfully for ${course?.courseName || "course"}.`
      );
    } catch (error) {
      console.error("Create assignment error:", error);
      setMessage(error.message);
    }
  };

  // =============================
  // TEACHER: Grade submission
  // =============================
  const handleGrade = async (
    submission,
    marks,
    feedback
  ) => {
    const assignment = assignments.find(
      (item) => item.id === submission.assignmentId
    );

    const numericMarks = Number(marks);

    if (Number.isNaN(numericMarks)) {
      setMessage("Enter valid marks.");
      return;
    }

    if (
      numericMarks < 0 ||
      numericMarks > Number(assignment?.maxMarks || 100)
    ) {
      setMessage(
        `Marks must be between 0 and ${assignment?.maxMarks || 100}.`
      );
      return;
    }

    try {
      await setDoc(
        doc(db, "submissions", submission.id),
        {
          marks: numericMarks,
          feedback: feedback || "",
          status: "graded",
          gradedBy: user.uid,
          gradedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSubmissions((previous) =>
        previous.map((item) =>
          item.id === submission.id
            ? {
                ...item,
                marks: numericMarks,
                feedback: feedback || "",
                status: "graded",
              }
            : item
        )
      );

      setMessage("Marks and feedback saved successfully.");
    } catch (error) {
      console.error("Grading error:", error);
      setMessage(error.message);
    }
  };

  // =============================
  // Logout
  // =============================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  // =============================
  // Loading
  // =============================
  if (loading) {
    return (
      <div className="loading-screen">
        <h2>Loading EduSubmit...</h2>
      </div>
    );
  }

  // ============================================================
  // TEACHER DASHBOARD
  // ============================================================
  if (
    user &&
    profile &&
    profile.role === "teacher"
  ) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div>
            <h1>EduSubmit</h1>
            <p>
              Teacher Assignment Management Portal
            </p>
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">

          {message && (
            <p className="submission-message">
              {message}
            </p>
          )}

          <section className="welcome-card">
            <h2>
              Welcome, {profile.name}
            </h2>

            <p>
              Teacher Dashboard — manage assignments,
              submissions, marks and feedback.
            </p>
          </section>

          {/* ============================= */}
          {/* Create Assignment */}
          {/* ============================= */}

          <section className="dashboard-card">
            <h3>Create New Assignment</h3>

            <form
              onSubmit={handleCreateAssignment}
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "15px",
              }}
            >
              <input
                type="text"
                placeholder="Assignment title"
                value={assignmentTitle}
                onChange={(e) =>
                  setAssignmentTitle(e.target.value)
                }
                required
              />

              <textarea
                placeholder="Assignment description"
                value={assignmentDescription}
                onChange={(e) =>
                  setAssignmentDescription(
                    e.target.value
                  )
                }
                rows="4"
              />

              <select
                value={assignmentCourseId}
                onChange={(e) =>
                  setAssignmentCourseId(e.target.value)
                }
                required
              >
                <option value="">
                  Select Course
                </option>

                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.courseName} (
                    {course.courseCode})
                  </option>
                ))}
              </select>

              <label>
                Due Date
              </label>

              <input
                type="datetime-local"
                value={assignmentDueDate}
                onChange={(e) =>
                  setAssignmentDueDate(e.target.value)
                }
                required
              />

              <input
                type="number"
                min="1"
                value={assignmentMaxMarks}
                onChange={(e) =>
                  setAssignmentMaxMarks(e.target.value)
                }
                placeholder="Maximum marks"
              />

              <button
                type="submit"
                className="submit-assignment-btn"
              >
                Create Assignment
              </button>
            </form>
          </section>

          {/* ============================= */}
          {/* Assignments */}
          {/* ============================= */}

          <section className="dashboard-card">
            <h3>Assignments</h3>

            {assignments.length === 0 ? (
              <p>No assignments available.</p>
            ) : (
              <div className="assignment-list">
                {assignments.map((assignment) => {
                  const course = courses.find(
                    (item) =>
                      item.id === assignment.courseId
                  );

                  return (
                    <div
                      className="assignment-item"
                      key={assignment.id}
                    >
                      <h4>
                        {assignment.title}
                      </h4>

                      <p>
                        {assignment.description}
                      </p>

                      <p>
                        <strong>
                          Course:
                        </strong>{" "}
                        {course?.courseName ||
                          "Unknown Course"}
                      </p>

                      <p>
                        <strong>
                          Due:
                        </strong>{" "}
                        {assignment.dueDate?.toDate
                          ? assignment.dueDate
                              .toDate()
                              .toLocaleString()
                          : "Not available"}
                      </p>

                      <p>
                        <strong>
                          Maximum Marks:
                        </strong>{" "}
                        {assignment.maxMarks}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ============================= */}
          {/* Student Submissions */}
          {/* ============================= */}

          <section className="dashboard-card">
            <h3>
              Student Submissions
            </h3>

            {submissions.length === 0 ? (
              <p>
                No student submissions yet.
              </p>
            ) : (
              <div className="submission-list">
                {submissions.map((submission) => {
                  const assignment =
                    assignments.find(
                      (item) =>
                        item.id ===
                        submission.assignmentId
                    );

                  return (
                    <TeacherSubmission
                      key={submission.id}
                      submission={submission}
                      assignment={assignment}
                      onGrade={handleGrade}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* ============================= */}
          {/* Cloud Concepts */}
          {/* ============================= */}

          <section className="dashboard-card">
            <h3>Cloud Features</h3>

            <ul>
              <li>
                Firebase Authentication
              </li>
              <li>
                Cloud Firestore Database
              </li>
              <li>
                Role-Based Access
              </li>
              <li>
                Assignment Management
              </li>
              <li>
                Student Submission Tracking
              </li>
              <li>
                Teacher Grading & Feedback
              </li>
              <li>
                Versioned Resubmissions
              </li>
            </ul>
          </section>

        </main>
      </div>
    );
  }

  // ============================================================
  // STUDENT DASHBOARD
  // ============================================================

  if (user && profile) {
    return (
      <div className="dashboard">

        <header className="dashboard-header">
          <div>
            <h1>EduSubmit</h1>

            <p>
              Student Assignment Submission
              & Feedback Portal
            </p>
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">

          {message && (
            <p className="submission-message">
              {message}
            </p>
          )}

          <section className="welcome-card">
            <h2>
              Welcome, {profile.name}
            </h2>

            <p>
              Here is your student dashboard.
            </p>
          </section>

          <section className="info-grid">

            {/* COURSES */}

            <div className="dashboard-card">
              <h3>My Courses</h3>

              {courses.length === 0 ? (
                <p>
                  No courses available yet.
                </p>
              ) : (
                <div className="course-list">

                  {courses.map((course) => (
                    <div
                      className="course-item"
                      key={course.id}
                    >
                      <h4>
                        {course.courseName}
                      </h4>

                      <p>
                        <strong>
                          Course Code:
                        </strong>{" "}
                        {course.courseCode}
                      </p>

                      <p>
                        {course.description}
                      </p>
                    </div>
                  ))}

                </div>
              )}
            </div>

            {/* ASSIGNMENTS */}

            <div className="dashboard-card">
              <h3>Assignments</h3>

              {assignments.length === 0 ? (
                <p>
                  No assignments available yet.
                </p>
              ) : (
                <div className="assignment-list">

                  {assignments.map(
                    (assignment) => (
                      <div
                        className="assignment-item"
                        key={assignment.id}
                      >

                        <h4>
                          {assignment.title}
                        </h4>

                        <p>
                          {assignment.description}
                        </p>

                        <p>
                          <strong>
                            Due Date:
                          </strong>{" "}
                          {assignment.dueDate?.toDate
                            ? assignment.dueDate
                                .toDate()
                                .toLocaleString()
                            : "Not available"}
                        </p>

                        <p>
                          <strong>
                            Maximum Marks:
                          </strong>{" "}
                          {assignment.maxMarks}
                        </p>

                        <p>
                          <strong>
                            Maximum File Size:
                          </strong>{" "}
                          {assignment.maxFileSizeMB || 10} MB
                        </p>

                        <div className="submission-box">

                          <h5>
                            Submit Assignment
                          </h5>

                          <input
                            id={`file-${assignment.id}`}
                            type="file"
                            accept=".pdf,.docx"
                            className="assignment-file-input"
                            onChange={(e) =>
                              handleFileChange(
                                assignment.id,
                                e.target.files[0]
                              )
                            }
                          />

                          <label
                            htmlFor={`file-${assignment.id}`}
                            className="choose-file-btn"
                          >
                            Choose File
                          </label>

                          {selectedFiles[
                            assignment.id
                          ] && (
                            <p className="selected-file">
                              Selected file:{" "}
                              <strong>
                                {
                                  selectedFiles[
                                    assignment.id
                                  ].name
                                }
                              </strong>
                            </p>
                          )}

                          <button
                            type="button"
                            className="submit-assignment-btn"
                            onClick={() =>
                              handleSubmission(
                                assignment
                              )
                            }
                          >
                            Submit Assignment
                          </button>

                        </div>
                      </div>
                    )
                  )}

                </div>
              )}
            </div>

            {/* SUBMISSIONS */}

            <div className="dashboard-card">
              <h3>Submissions</h3>

              {submissions.length === 0 ? (
                <p>
                  No submissions yet.
                </p>
              ) : (
                <div className="submission-list">

                  {submissions.map(
                    (submission) => {

                      const assignment =
                        assignments.find(
                          (item) =>
                            item.id ===
                            submission.assignmentId
                        );

                      return (
                        <div
                          className="submission-item"
                          key={submission.id}
                        >

                          <h4>
                            {assignment
                              ? assignment.title
                              : "Assignment"}
                          </h4>

                          <p>
                            <strong>
                              Status:
                            </strong>{" "}
                            {submission.status}
                          </p>

                          <p>
                            <strong>
                              Version:
                            </strong>{" "}
                            {submission.currentVersion}
                          </p>

                          <p>
                            <strong>
                              File:
                            </strong>{" "}
                            {submission.fileName}
                          </p>

                          <p>
                            <strong>
                              Submitted:
                            </strong>{" "}
                            {submission.submittedAt?.toDate
                              ? submission.submittedAt
                                  .toDate()
                                  .toLocaleString()
                              : "Processing..."}
                          </p>

                          {submission.status ===
                            "graded" && (
                            <div
                              style={{
                                padding: "15px",
                                marginTop: "10px",
                                borderRadius: "8px",
                                background: "#eef7ee",
                              }}
                            >
                              <h4>
                                Grade & Feedback
                              </h4>

                              <p>
                                <strong>
                                  Marks:
                                </strong>{" "}
                                {submission.marks}
                                {" / "}
                                {assignment?.maxMarks ||
                                  100}
                              </p>

                              <p>
                                <strong>
                                  Feedback:
                                </strong>{" "}
                                {submission.feedback ||
                                  "No feedback provided."}
                              </p>
                            </div>
                          )}

                          {/* RESUBMISSION */}

                          <div className="resubmit-section">

                            <input
                              id={`resubmit-${submission.id}`}
                              type="file"
                              accept=".pdf,.docx"
                              className="resubmit-file-input"
                              onChange={(e) =>
                                handleResubmitFileChange(
                                  submission,
                                  e.target.files[0]
                                )
                              }
                            />

                            <button
                              type="button"
                              className="resubmit-btn"
                              onClick={() =>
                                document
                                  .getElementById(
                                    `resubmit-${submission.id}`
                                  )
                                  .click()
                              }
                            >
                              Resubmit Assignment
                            </button>

                            {resubmitFiles[
                              submission.id
                            ] && (
                              <p className="selected-file">
                                Selected file:{" "}
                                <strong>
                                  {
                                    resubmitFiles[
                                      submission.id
                                    ].name
                                  }
                                </strong>
                              </p>
                            )}

                            {resubmitFiles[
                              submission.id
                            ] && (
                              <button
                                type="button"
                                className="confirm-resubmit-btn"
                                onClick={() =>
                                  handleResubmit(
                                    submission
                                  )
                                }
                              >
                                Confirm Resubmission
                              </button>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}
            </div>

            {/* DEADLINES */}

            <div className="dashboard-card">
              <h3>
                Upcoming Deadlines
              </h3>

              {assignments.length === 0 ? (
                <p>
                  No upcoming deadlines.
                </p>
              ) : (
                assignments.map(
                  (assignment) => (
                    <p key={assignment.id}>
                      <strong>
                        {assignment.title}
                      </strong>{" "}
                      —{" "}
                      {assignment.dueDate?.toDate
                        ? assignment.dueDate
                            .toDate()
                            .toLocaleString()
                        : "Not available"}
                    </p>
                  )
                )
              )}
            </div>

            {/* FEEDBACK */}

            <div className="dashboard-card">
              <h3>
                Feedback & Marks
              </h3>

              {submissions.filter(
                (item) =>
                  item.status === "graded"
              ).length === 0 ? (
                <p>
                  No feedback available yet.
                </p>
              ) : (
                submissions
                  .filter(
                    (item) =>
                      item.status === "graded"
                  )
                  .map((submission) => {
                    const assignment =
                      assignments.find(
                        (item) =>
                          item.id ===
                          submission.assignmentId
                      );

                    return (
                      <div
                        key={submission.id}
                        style={{
                          padding: "12px",
                          marginBottom: "10px",
                          borderRadius: "8px",
                          background: "#eef7ee",
                        }}
                      >
                        <strong>
                          {assignment?.title ||
                            "Assignment"}
                        </strong>

                        <p>
                          Marks:{" "}
                          {submission.marks} /{" "}
                          {assignment?.maxMarks ||
                            100}
                        </p>

                        <p>
                          Feedback:{" "}
                          {submission.feedback ||
                            "No feedback"}
                        </p>
                      </div>
                    );
                  })
              )}
            </div>

          </section>

        </main>
      </div>
    );
  }

  // ============================================================
  // LOGIN / REGISTRATION
  // ============================================================

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h1>EduSubmit</h1>

        <p className="auth-description">
          Cloud-Based Student Assignment
          Submission & Feedback Portal
        </p>

        <h2>
          {isLogin
            ? "Login"
            : "Registration"}
        </h2>

        <form onSubmit={handleSubmit}>

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />

              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "12px",
                }}
              >
                <option value="student">
                  Student
                </option>

                <option value="teacher">
                  Teacher
                </option>
              </select>
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            type="submit"
            className="auth-submit-btn"
          >
            {isLogin
              ? "Login"
              : "Register"}
          </button>

        </form>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        <button
          type="button"
          className="switch-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage("");
          }}
        >
          {isLogin
            ? "Create an Account"
            : "Already have an account? Login"}
        </button>

      </div>

    </div>
  );
}

// ============================================================
// Teacher Submission Component
// ============================================================

function TeacherSubmission({
  submission,
  assignment,
  onGrade,
}) {
  const [marks, setMarks] = useState(
    submission.marks ?? ""
  );

  const [feedback, setFeedback] = useState(
    submission.feedback ?? ""
  );

  return (
    <div
      className="submission-item"
      style={{
        marginBottom: "15px",
        padding: "18px",
      }}
    >
      <h4>
        {assignment?.title ||
          "Assignment"}
      </h4>

      <p>
        <strong>
          Student:
        </strong>{" "}
        {submission.studentName ||
          "Student"}
      </p>

      <p>
        <strong>
          Email:
        </strong>{" "}
        {submission.studentEmail ||
          "Not available"}
      </p>

      <p>
        <strong>
          File:
        </strong>{" "}
        {submission.fileName ||
          "No file"}
      </p>

      <p>
        <strong>
          Status:
        </strong>{" "}
        {submission.status}
      </p>

      <p>
        <strong>
          Version:
        </strong>{" "}
        {submission.currentVersion ||
          1}
      </p>

      <p>
        <strong>
          Submitted:
        </strong>{" "}
        {submission.submittedAt?.toDate
          ? submission.submittedAt
              .toDate()
              .toLocaleString()
          : "Processing..."}
      </p>

      <hr />

      <h4>
        Grade Submission
      </h4>

      <input
        type="number"
        min="0"
        max={assignment?.maxMarks || 100}
        placeholder={`Marks / ${
          assignment?.maxMarks || 100
        }`}
        value={marks}
        onChange={(e) =>
          setMarks(e.target.value)
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
        }}
      />

      <textarea
        placeholder="Enter feedback for student"
        value={feedback}
        onChange={(e) =>
          setFeedback(e.target.value)
        }
        rows="4"
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
        }}
      />

      <button
        type="button"
        className="submit-assignment-btn"
        onClick={() =>
          onGrade(
            submission,
            marks,
            feedback
          )
        }
      >
        Save Marks & Feedback
      </button>
    </div>
  );
}

export default App;