import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  loginUser,
  loginAdmin
} from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async(e)=>{
    e.preventDefault();
    setLoading(true);

    try{
      const data = role === "admin"
        ? await loginAdmin({ email, password })
        : await loginUser({ email, password });

      // Handle nested response data safely (in case backend wraps it in data.data)
      const token = data.token || data.data?.token;
      const userRole = data.role || data.data?.role || role;
      const userInfo = data.user || data.admin || data.data?.user || data.data?.admin;

      if (!token) {
        throw new Error("Token missing from server response");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", userRole);
      localStorage.setItem("user", JSON.stringify(userInfo));

      if(role === "admin"){
          navigate("/admin");
      } else{
          navigate("/dashboard");
      }

    }catch(err){
      alert(err.message || "Login failed");
    }finally{
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7fe]">

      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-[2rem] shadow-xl w-96 border border-gray-50"
      >

        <h2 className="text-2xl font-bold text-purple-700 mb-6 text-center">
          Welcome Back
        </h2>


        {/* Role Selection */}
        <div className="flex gap-3 mb-6">

          <button
            type="button"
            onClick={() => setRole("user")}
            className={`flex-1 p-3 rounded-xl font-semibold ${
              role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            User
          </button>


          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`flex-1 p-3 rounded-xl font-semibold ${
              role === "admin"
                ? "bg-red-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Admin
          </button>

        </div>



        <input
          className="w-full p-4 mb-3 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition-all"
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />


        <input
          className="w-full p-4 mb-6 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition-all"
          placeholder="Password"
          type="password"
          required
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />



        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition disabled:bg-gray-400 shadow-lg shadow-purple-100"
        >
          {
            loading
              ? "Checking..."
              : "Login"
          }
        </button>



        {/* Signup only for users */}
        {role === "user" && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              className="text-purple-600 cursor-pointer font-bold"
            >
              Sign Up
            </span>
          </p>
        )}

      </form>

    </div>
  );
}

export default Login;