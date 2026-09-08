"use client";
import React, { useEffect, useState } from 'react';
import Loading from '../../components/Loader/Loading';  // Loader component
import Error from '../../components/Error/Error';  // Error component
import useFetchData from '../../hooks/useFetchData';  // Custom hook to fetch data

const Email = () => {
  const [emails, setEmails] = useState([]);  // State to store the email data

  // Using your custom hook to fetch email data
  const { data, loading, error } = useFetchData(`${(import.meta.env.VITE_API_URL || "https://backend-9k3q.onrender.com/api")}/subscribe/emails`);

  useEffect(() => {
    if (data) {
      setEmails(data);  // Store the fetched email data
      console.log("Fetched email data:", data);  // Debugging log to check the structure
    }
  }, [data]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Email List</h2>

      {/* Loading state */}
      {loading && <Loading />}  {/* Use your loader component here */}
      {error && <Error message={error} />}  {/* Use your error component here */}

      {/* Display a message if no emails are found */}
      {!loading && !error && emails.length === 0 && <p>No emails found</p>}

      {/* Email table */}
      {!loading && !error && emails.length > 0 && (
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase">Email Address</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => (
              <tr key={email._id} className="border-b">
                <td className="py-2 px-4">{email.email}</td>  {/* Display the email address */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Email;
