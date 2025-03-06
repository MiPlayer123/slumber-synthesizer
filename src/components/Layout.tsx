import { Outlet } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";

const Layout = () => {
  return (
    <>
      <Outlet />
      <SpeedInsights />
    </>
  );
};

export default Layout;
