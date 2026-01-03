import { FC, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useAppDispatch, useAppSelector } from '@store/index';
import { fetchClientes, setFilters } from '@store/slices/clientesSlice';

const ClientesPage: FC = () => {
  const dispatch = useAppDispatch();
  const { items, isLoading, pagination, filters } = useAppSelector((state) => state.clientes);
  const [searchValue, setSearchValue] = useState(filters.search);

  useEffect(() => {
    dispatch(fetchClientes());
  }, [dispatch, pagination.page, pagination.limit, filters]);

  const handleSearch = () => {
    dispatch(setFilters({ search: searchValue }));
  };

  const handleRefresh = () => {
    dispatch(fetchClientes());
  };

  const columns: GridColDef[] = [
    { field: 'codigo', headerName: 'Código', width: 100 },
    { field: 'razao_social', headerName: 'Razão Social', flex: 1, minWidth: 200 },
    { field: 'nome_fantasia', headerName: 'Nome Fantasia', flex: 1, minWidth: 150 },
    { field: 'cpf_cnpj', headerName: 'CPF/CNPJ', width: 150 },
    { field: 'cidade', headerName: 'Cidade', width: 150 },
    { field: 'uf', headerName: 'UF', width: 60 },
    {
      field: 'ativo',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Ativo' : 'Inativo'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Tooltip title="Visualizar">
            <IconButton size="small" color="primary">
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Clientes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os clientes cadastrados no sistema
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Novo Cliente
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar clientes..."
            size="small"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            Buscar
          </Button>
          <Button variant="outlined" startIcon={<FilterIcon />}>
            Filtros
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Atualizar">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={items}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={{ page: pagination.page - 1, pageSize: pagination.limit }}
          rowCount={pagination.total}
          paginationMode="server"
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
          }}
        />
      </Card>
    </Box>
  );
};

export default ClientesPage;
