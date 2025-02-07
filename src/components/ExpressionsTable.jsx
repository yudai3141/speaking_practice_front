// frontend/src/components/ExpressionsTable.jsx
import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { styled } from '@mui/material/styles';
import { 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper 
} from '@mui/material';

// サイバーパンク風のテーブルスタイル
const CyberTable = styled(TableContainer)`
  background: rgba(0, 0, 0, 0.8) !important;
  border: 1px solid #00ff00 !important;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3) !important;
  margin: 20px 0;

  & .MuiTable-root {
    background: transparent;
  }

  & .MuiTableCell-root {
    color: #00ff00;
    border-color: rgba(0, 255, 0, 0.3);
    font-family: 'Share Tech Mono', monospace;
  }

  & .MuiTableHead-root .MuiTableCell-root {
    background: rgba(0, 255, 0, 0.1);
    font-weight: bold;
  }

  & .MuiTableRow-root:hover {
    background: rgba(0, 255, 0, 0.05);
  }
`;

// 練習する表現のセクションのスタイル
const CyberSection = styled('div')`
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #00ff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  padding: 20px;
  margin: 20px 0;
  border-radius: 4px;

  & h2 {
    color: #00ff00;
    font-family: 'Orbitron', sans-serif;
    margin-top: 0;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
  }

  & .MuiList-root {
    background: transparent;
  }

  & .MuiListItem-root {
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
    
    &:hover {
      background: rgba(0, 255, 0, 0.05);
    }
  }

  & .MuiListItemText-primary {
    color: #00ff00;
    font-family: 'Share Tech Mono', monospace;
  }

  & .MuiListItemText-secondary {
    color: rgba(0, 255, 0, 0.7);
    font-family: 'Share Tech Mono', monospace;
  }
`;

const CyberDataGrid = styled(DataGrid)`
  background: rgba(0, 0, 0, 0.8) !important;
  border: 1px solid #00ff00 !important;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3) !important;
  color: #00ff00 !important;
  font-family: 'Share Tech Mono', monospace !important;

  .MuiDataGrid-columnHeaders {
    background: rgba(0, 255, 0, 0.1);
    border-bottom: 1px solid rgba(0, 255, 0, 0.3) !important;
  }

  .MuiDataGrid-cell {
    border-bottom: 1px solid rgba(0, 255, 0, 0.2) !important;
  }

  .MuiDataGrid-row:hover {
    background: rgba(0, 255, 0, 0.05) !important;
  }

  .MuiDataGrid-footerContainer {
    border-top: 1px solid rgba(0, 255, 0, 0.3) !important;
  }

  .MuiTablePagination-root {
    color: #00ff00 !important;
  }

  .MuiIconButton-root {
    color: #00ff00 !important;
  }

  .MuiDataGrid-menuIcon button {
    color: #00ff00 !important;
  }

  .MuiDataGrid-sortIcon {
    color: #00ff00 !important;
  }
`;

const CyberExpressionButton = styled('button')`
  background: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  border: 1px solid #00ff00;
  padding: 8px 16px;
  margin: 4px;
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);

  &:hover {
    background: rgba(0, 255, 0, 0.1);
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  }
`;

const ExpressionsTable = ({ rows, onExpressionChange }) => {
  const columns = [
    { field: "expression", headerName: "Expression", width: 180 },
    { field: "meaning", headerName: "Meaning", width: 200 },
    { field: "usageExample", headerName: "Usage Example", width: 200 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "referenceCount", headerName: "Ref Cnt", width: 100 },
    { field: "usefulness", headerName: "Useful?", width: 100 },
    { field: "lastReferredTime", headerName: "Last Referred", width: 150 }
  ];

  const expressions = [
    { name: 'neutral', values: { mouthOpen: 0, mouthSmile: 0 } },
    { name: 'smile', values: { mouthOpen: 0, mouthSmile: 1 } },
    { name: 'talk', values: { mouthOpen: 0.5, mouthSmile: 0 } }
  ];

  return (
    <div style={{ height: 400, width: "100%" }}>
      <CyberDataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
      />
      <div className="expressions-table" style={{ marginTop: '20px' }}>
        {expressions.map(exp => (
          <CyberExpressionButton
            key={exp.name}
            onClick={() => onExpressionChange(exp.values)}
          >
            {exp.name}
          </CyberExpressionButton>
        ))}
      </div>
    </div>
  );
};

export default ExpressionsTable;

export const ReviewSession = () => {
  return (
    <CyberSection>
      <h2>練習する表現</h2>
      {/* 既存のコンテンツ */}
    </CyberSection>
  );
};
