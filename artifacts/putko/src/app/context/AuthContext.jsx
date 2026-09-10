"use client"

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  SESSION_EXPIRED_EVENT,
  activateGuestHostMode,
  getGuestProfile,
  isTestGuestToken,
  logoutTestGuest,
  switchGuestMode,
} from "../utlis/guestAccountApi";

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
        role: action.payload.role || action.payload.user?.activeMode,
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
        if (isTestGuestToken(token)) {
          getGuestProfile()
            .then((freshUser) => {
              dispatch({
                type: "LOGIN_SUCCESS",
                payload: { user: freshUser, token, role: freshUser.activeMode },
              });
            })
            .catch(() => dispatch({ type: "LOGOUT" }))
            .finally(() => setLoading(false));
          return;
        }
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: { user: JSON.parse(user), token, role },
        });
      }
    }
    setLoading(false);
  }, []);

  // A 401 for the token we are currently signed in with means the server no
  // longer knows this session (expired, logged out elsewhere, server reset).
  // Ending it here lets ProtectedRoute send the user to /login with a
  // returnTo, instead of every screen showing "session expired" + Retry.
  const tokenRef = useRef(null);
  tokenRef.current = state.token;
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onExpired = (event) => {
      const expiredToken = event?.detail?.token;
      if (!expiredToken || expiredToken !== tokenRef.current) return;
      dispatch({ type: "LOGOUT" });
      const language = localStorage.getItem("appLanguage") === "en" ? "en" : "sk";
      toast.info(
        language === "en"
          ? "Your session has expired. Please log in again."
          : "Platnosť relácie vypršala. Prihláste sa znova.",
        { toastId: "session-expired" },
      );
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
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

  const accountDispatch = (action) => {
    if (action.type === "LOGOUT" && isTestGuestToken(state.token)) {
      void logoutTestGuest(state.token);
    }
    dispatch(action);
  };

  const applyTestGuest = (freshUser) => {
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: {
        user: freshUser,
        token: state.token,
        role: freshUser.activeMode,
      },
    });
    return freshUser;
  };

  const activateHost = async () => {
    if (!isTestGuestToken(state.token)) {
      throw new Error("Host activation is available only for development accounts.");
    }
    return applyTestGuest(await activateGuestHostMode());
  };

  const switchMode = async (mode) => {
    if (!isTestGuestToken(state.token)) {
      throw new Error("Mode switching is available only for development accounts.");
    }
    return applyTestGuest(await switchGuestMode(mode));
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        role: state.role,
        loading,
        dispatch: accountDispatch,
        activateHost,
        switchMode,
        isDevelopmentAccount: isTestGuestToken(state.token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);
