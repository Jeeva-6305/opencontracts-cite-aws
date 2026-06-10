import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@os-legal/ui";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <AlertTriangle size={64} color="#f97316" />
      <h2 style={{ marginTop: "1rem" }}>404 — Not Found</h2>
      <p style={{ color: OS_LEGAL_COLORS.textSecondary }}>
        The page you requested does not exist or the resource is not publicly
        accessible.
      </p>
      <Button variant="primary" onClick={() => navigate("/corpuses")}>
        Go to Corpuses
      </Button>
    </div>
  );
};

export default NotFound;
