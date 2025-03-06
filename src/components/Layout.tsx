import { Outlet } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/next";

const Layout = () => {
  return (
    <>
      <Outlet />
      <SpeedInsights />
    </>
  );
};

export default Layout;
