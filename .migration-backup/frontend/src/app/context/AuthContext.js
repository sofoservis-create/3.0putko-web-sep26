"use client"

import { createContext, useContext, useEffect, useReducer, useState } from "react";

const initialState = {
  user: null,
  role: null,
  token: null,
};

export const AuthContext = createContext(initialState);

const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN_START":
      return {
        user: null,
        role: null,
        token: null,
      };

    case "LOGIN_SUCCESS":
      return {
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.role,
      };

    case "LOGOUT":
      return {
        user: null,
        role: null,
        token: null,
      };

    default:
      return state;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (user && token && role) {
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: JSON.parse(user), token, role },
        });
      }
    }
    setLoading(false); // Mark loading as false once state is initialized
  }, []);

  useEffect(() => {
    if (state.user && state.token && state.role) {
      localStorage.setItem("user", JSON.stringify(state.user));
      localStorage.setItem("token", state.token);
      localStorage.setItem("role", state.role);
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
    }
  }, [state]);

  if (loading) {
    return null; // Or show a loading spinner until the context is ready
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        role: state.role,
        dispatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);
