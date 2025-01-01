// frontend/src/components/ExpressionsTable.jsx
import React from "react";
import { DataGrid } from "@mui/x-data-grid";

const ExpressionsTable = ({ rows }) => {
  const columns = [
    { field: "expression", headerName: "Expression", width: 180 },
    { field: "meaning", headerName: "Meaning", width: 200 },
    { field: "usageExample", headerName: "Usage Example", width: 200 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "referenceCount", headerName: "Ref Cnt", width: 100 },
    { field: "usefulness", headerName: "Useful?", width: 100 },
    { field: "lastReferredTime", headerName: "Last Referred", width: 150 }
  ];

  return (
    <div style={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
      />
    </div>
  );
};

export default ExpressionsTable;
