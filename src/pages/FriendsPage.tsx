import React from "react";
import { Helmet } from "react-helmet-async";

const FriendsPage = () => {
  return (
    <>
      <Helmet>
        <title>Rem</title>
      </Helmet>
      <div>
        <h1>Friends Page</h1>
        {/* Your friends page content will go here */}
        <p>Manage your friends and connections.</p>
      </div>
    </>
  );
};

export default FriendsPage;
