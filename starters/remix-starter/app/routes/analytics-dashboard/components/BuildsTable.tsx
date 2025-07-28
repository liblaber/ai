import { UniversalTableCard } from '@/components/building-blocks/universal-table-card/universal-table-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const buildsQuery = `
  SELECT b.id,
         b.build_number,
         b.status,
         b.build_type,
         b.start_time,
         b.end_time,
         b.duration,
         a.name  as api_name,
         u.email as created_by
  FROM builds b
         LEFT JOIN apis a ON b.api_id = a.id
         LEFT JOIN users u ON b.created_by_id = u.id
  WHERE b.is_deleted = false
    AND ($1::text IS NULL OR b.status::text = $1)
  ORDER BY b.created_at DESC
    LIMIT $2
  OFFSET $3
`;

export const buildsCountQuery = `
  SELECT COUNT(*) as total
  FROM builds b
  WHERE b.is_deleted = false AND b.status = ($1::text IS NULL OR b.status::text = $1)
`;

export enum BuildStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  IN_PROGRESS = 'IN_PROGRESS',
}

export interface BuildData {
  id: string;
  build_number: string;
  status: BuildStatus;
  build_type: string[];
  start_time: string;
  end_time: string;
  duration: string;
  api_name: string;
  created_by: string;
}

export interface BuildCountData {
  total: number;
}

const ITEMS_PER_PAGE = 10;

interface BuildsTableProps {
  builds: BuildData[];
  buildsCount: number;
  isLoading: boolean;
  onFiltersChange?: (filters: { page: number; status: BuildStatus }) => void;
}

export function BuildsTable({ builds, buildsCount, isLoading, onFiltersChange }: BuildsTableProps) {
  const [status, setStatus] = useState<BuildStatus>(BuildStatus.SUCCESS);
  const [currentPage, setCurrentPage] = useState(1);

  const handleStatusChange = (value: string) => {
    const buildStatus = value as BuildStatus;
    setStatus(buildStatus);
    setCurrentPage(1);
    onFiltersChange?.({ page: 1, status: buildStatus });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onFiltersChange?.({ page, status });
  };

  const totalPages = buildsCount > 0 ? Math.ceil(buildsCount / ITEMS_PER_PAGE) : 0;

  const StatusFilter = (
    <Select value={status} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BuildStatus.SUCCESS}>Success</SelectItem>
        <SelectItem value={BuildStatus.FAILURE}>Failure</SelectItem>
        <SelectItem value={BuildStatus.IN_PROGRESS}>In Progress</SelectItem>
      </SelectContent>
    </Select>
  );

  const PaginationControls = (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <UniversalTableCard
      title="Builds"
      description="List of all builds with their status and details"
      CardHeaderComponent={StatusFilter}
      CardFooterComponent={PaginationControls}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Build Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>API</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : builds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                No builds found
              </TableCell>
            </TableRow>
          ) : (
            builds.map((build: BuildData) => (
              <TableRow key={build.id}>
                <TableCell>{build.build_number}</TableCell>
                <TableCell>{build.status}</TableCell>
                <TableCell>{build.build_type}</TableCell>
                <TableCell>{build.api_name}</TableCell>
                <TableCell>{build.created_by}</TableCell>
                <TableCell>{new Date(build.start_time).toLocaleString()}</TableCell>
                <TableCell>{build.end_time ? new Date(build.end_time).toLocaleString() : '-'}</TableCell>
                <TableCell>{build.duration}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </UniversalTableCard>
  );
}
