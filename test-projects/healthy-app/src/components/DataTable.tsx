import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel,
  Paper, Typography, Box, TextField, InputAdornment
} from '@mui/material';
import { Search } from '@mui/icons-material';

type Order = 'asc' | 'desc';

interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  sortable?: boolean;
  format?: (value: any) => React.ReactNode;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  rows: T[];
  title?: string;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
}

function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  title,
  searchable = false,
  searchKeys = [],
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof T | null>(null);
  const [order, setOrder] = useState<Order>('asc');
  const [search, setSearch] = useState('');

  const handleSort = (col: keyof T) => {
    if (orderBy === col) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(col);
      setOrder('asc');
    }
  };

  const filtered = rows.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return searchKeys.some((k) => String(row[k]).toLowerCase().includes(q));
  });

  const sorted = orderBy
    ? [...filtered].sort((a, b) => {
        const av = a[orderBy];
        const bv = b[orderBy];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return order === 'asc' ? cmp : -cmp;
      })
    : filtered;

  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper variant="outlined">
      {(title || searchable) && (
        <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
          {title && <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>}
          {searchable && (
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Box>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={String(col.id)} style={{ minWidth: col.minWidth }}>
                  {col.sortable ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((col) => (
                  <TableCell key={String(col.id)}>
                    {col.format ? col.format(row[col.id]) : String(row[col.id])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography variant="body2" color="text.secondary" py={2}>
                    No results found.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={sorted.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
}

export default DataTable;
