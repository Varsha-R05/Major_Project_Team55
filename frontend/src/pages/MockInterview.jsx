import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRoles, fetchCompanies } from "../services/api";

const TOTAL_QUESTIONS = 5;

const TOPICS = [
  "General",
  "HR Interview",
  "Behavioral Questions",
  "Programming",
  "Data Structures",
  "Algorithms",
  "Object-Oriented Programming",
  "Database",
  "Web Development",
  "System Design",
];

export default function MockInterview() {
  const navigate = useNavigate();

  // =========================================
  // STATE
  // =========================================
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [selectedRole, setSelectedRole] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("General");

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  // =========================================
  // LOAD COMPANIES
  // =========================================
  useEffect(() => {
    const initLoad = async () => {
      try {
        setLoading(true);

        const companiesData = await fetchCompanies();

        setCompanies(
          Array.isArray(companiesData)
            ? companiesData
            : []
        );
      } catch (err) {
        console.error("Error fetching companies:", err);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    initLoad();
  }, []);

  // =========================================
  // LOAD ROLES WHEN COMPANY CHANGES
  // =========================================
  useEffect(() => {
    const updateRoles = async () => {
      // No company selected
      if (!selectedCompany) {
        setRoles([]);
        setSelectedRole("");
        setRolesLoading(false);
        return;
      }

      try {
        setRolesLoading(true);

        const rolesData = await fetchRoles(
          selectedCompany
        );

        const validRoles = Array.isArray(rolesData)
          ? rolesData
          : [];

        setRoles(validRoles);

        // Automatically select first role
        if (validRoles.length > 0) {
          setSelectedRole(
            String(validRoles[0].id)
          );
        } else {
          setSelectedRole("");
        }
      } catch (err) {
        console.error("Error fetching roles:", err);

        setRoles([]);
        setSelectedRole("");
      } finally {
        setRolesLoading(false);
      }
    };

    updateRoles();
  }, [selectedCompany]);

  // =========================================
  // START INTERVIEW
  // =========================================
  const handleStart = () => {
    // -----------------------------------------
    // Validate role
    // -----------------------------------------
    if (!selectedRole) {
      alert("Please select a role.");
      return;
    }

    // -----------------------------------------
    // Find selected role
    // -----------------------------------------
    const selectedRoleObject = roles.find(
      (role) =>
        String(role.id) === String(selectedRole)
    );

    if (!selectedRoleObject) {
      alert("Unable to find the selected role.");
      return;
    }

    // -----------------------------------------
    // Find selected company
    // -----------------------------------------
    const selectedCompanyObject = companies.find(
      (company) =>
        String(company.id) ===
        String(selectedCompany)
    );

    // -----------------------------------------
    // Get names
    // -----------------------------------------
    const roleName =
      selectedRoleObject.role_name;

    const companyName =
      selectedCompanyObject?.company_name ||
      "General";

    // -----------------------------------------
    // Get logged-in user
    // -----------------------------------------
    const savedUser =
      localStorage.getItem("user");

    const user = savedUser
      ? JSON.parse(savedUser)
      : null;

    if (!user || !user.id) {
      alert("Please log in before starting the interview.");
      navigate("/login");
      return;
    }

    // -----------------------------------------
    // Interview information
    // -----------------------------------------
    const interviewInfo = {
      candidateId: user.id,

      roleId: Number(selectedRole),

      role: roleName,

      companyId: selectedCompany
        ? Number(selectedCompany)
        : null,

      company: companyName,

      topic: selectedTopic || "General",

      question_type: "Technical",

      category: "Conceptual",

      totalQuestions: TOTAL_QUESTIONS,
    };

    // -----------------------------------------
    // Clear previous interview state
    // -----------------------------------------
    sessionStorage.removeItem(
      "current_interview_questions"
    );

    sessionStorage.removeItem(
      "current_interview_history"
    );

    sessionStorage.removeItem(
      "current_interview"
    );

    // -----------------------------------------
    // Save current interview
    // -----------------------------------------
    sessionStorage.setItem(
      "current_interview",
      JSON.stringify(interviewInfo)
    );

    // -----------------------------------------
    // Navigate to Interview
    // -----------------------------------------
    navigate("/interview", {
      state: interviewInfo,
    });
  };

  // =========================================
  // UI
  // =========================================
  return (
    <div className="p-10 max-w-2xl mx-auto shadow-xl rounded-2xl bg-white border mt-10">

      <h2 className="text-3xl font-bold mb-6 text-blue-700">
        Prepare Your Interview
      </h2>

      <div className="space-y-6">

        {/* =====================================
            COMPANY
        ====================================== */}
      
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Target Company
          </label>

          <select
            className="w-full border-2 p-3 rounded-lg focus:border-blue-500 outline-none disabled:bg-gray-100"
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setSelectedRole("");
            }}
            disabled={loading}
          >
            <option value="">
              -- Select a company --
            </option>

            {companies.map((company) => (
              <option
                key={company.id}
                value={String(company.id)}
              >
                {company.company_name}
              </option>
            ))}
          </select>
        </div>


        {/* =====================================
            ROLE
        ====================================== */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Target Role
          </label>

          <select
            className="w-full border-2 p-3 rounded-lg focus:border-blue-500 outline-none disabled:bg-gray-100"
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value)
            }
            disabled={
              loading ||
              rolesLoading ||
              !selectedCompany
            }
          >
            {!selectedCompany ? (
              <option value="">
                Select a company first
              </option>
            ) : rolesLoading ? (
              <option value="">
                Updating roles...
              </option>
            ) : roles.length === 0 ? (
              <option value="">
                No roles available
              </option>
            ) : (
              roles.map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                >
                  {role.role_name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* =====================================
            TOPIC
        ====================================== */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Select Interview Topic
          </label>

          <select
            className="w-full border-2 p-3 rounded-lg focus:border-blue-500 outline-none"
            value={selectedTopic}
            onChange={(e) =>
              setSelectedTopic(e.target.value)
            }
            disabled={
              loading ||
              rolesLoading
            }
          >
            {TOPICS.map((topic) => (
              <option
                key={topic}
                value={topic}
              >
                {topic}
              </option>
            ))}
          </select>
        </div>

        {/* =====================================
            INTERVIEW INFORMATION
        ====================================== */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">

          <p className="text-sm text-blue-800">
            <strong>
              Interview format:
            </strong>
          </p>

          <p className="text-sm text-blue-700 mt-1">
            You will be asked{" "}
            <strong>
              {TOTAL_QUESTIONS}
            </strong>{" "}
             questions.
          </p>


        </div>

        {/* =====================================
            START BUTTON
        ====================================== */}
        <button
          onClick={handleStart}
          disabled={
            loading ||
            rolesLoading ||
            !selectedRole
          }
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all text-lg shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading || rolesLoading
            ? "Loading..."
            : "Start Mock Interview"}
        </button>

      </div>
    </div>
  );
}