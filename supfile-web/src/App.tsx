import { Box } from "@mui/material";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Box
      sx={{
        display: "flex",
        maxWidth: 1440,
        mx: "auto",
        width: "100%",
        minHeight: "100vh",
      }}
    >
      <Sidebar />
      <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        <Dashboard />
      </Box>
    </Box>
  );
}