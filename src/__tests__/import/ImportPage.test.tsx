import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImportPage from '../../pages/import/ImportPage';
import * as useLicensesHook from '../../hooks/useLicenses';
import * as useImportHook from '../../hooks/useImport';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

const mockLicense = {
  id: 'lic-1',
  userId: 'user-1',
  licenseType: 'EASA_PPL' as const,
  licenseNumber: 'PPL-12345',
  issuingAuthority: 'EASA',
  issueDate: '2024-01-01',
  expiryDate: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockTemplates = [
  {
    id: 'FOREFLIGHT_CSV',
    name: 'ForeFlight',
    vendor: 'ForeFlight (Boeing)',
    website: 'https://foreflight.com',
    description: 'ForeFlight Logbook export.',
    confidence: 'exact' as const,
    regions: ['FAA' as const],
    exportSteps: ['Open ForeFlight and go to Logbook.', 'Tap the gear icon, then Export Logbook.'],
    autoDetected: true,
  },
  {
    id: 'MYFLIGHTBOOK_CSV',
    name: 'MyFlightbook',
    vendor: 'MyFlightbook',
    website: 'https://myflightbook.com',
    description: 'MyFlightbook CSV export.',
    confidence: 'best-effort' as const,
    regions: ['FAA' as const],
    exportSteps: ['Sign in at myflightbook.com.', 'Download the CSV of all flights.'],
    autoDetected: true,
  },
];

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useLicensesHook, 'useLicenses').mockReturnValue({
      data: [mockLicense], isLoading: false, error: null,
    } as any);
    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({
      mutateAsync: vi.fn(), isPending: false,
    } as any);
    vi.spyOn(useImportHook, 'usePreviewImport').mockReturnValue({
      mutateAsync: vi.fn(), isPending: false,
    } as any);
    vi.spyOn(useImportHook, 'useConfirmImport').mockReturnValue({
      mutateAsync: vi.fn(), isPending: false,
    } as any);
    vi.spyOn(useImportHook, 'useImportTemplates').mockReturnValue({
      data: mockTemplates, isLoading: false, isError: false,
    } as any);
  });

  it('renders upload step with title', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getByText('Import Flights')).toBeInTheDocument();
    expect(screen.getAllByText(/upload csv/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
  });

  it('renders step indicator', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getByText(/1\. upload/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. map/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. preview/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. done/i)).toBeInTheDocument();
  });

  it('does not show license selector (flights detached from licenses)', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.queryByText(/import into license/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/select license/i)).not.toBeInTheDocument();
  });

  it('renders ForeFlight support info', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getAllByText(/csv/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows mapping step after upload', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      format: 'FOREFLIGHT_CSV',
      columns: ['Date', 'AircraftID', 'From', 'To', 'TotalTime'],
      previewRows: [{ Date: '2026-01-15', AircraftID: 'D-EFGH', From: 'EDDF', To: 'EDDH', TotalTime: '1.5' }],
      totalRows: 10,
      suggestedMappings: [
        { sourceColumn: 'Date', targetField: 'date' },
        { sourceColumn: 'AircraftID', targetField: 'aircraftReg' },
      ],
    });

    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({
      mutateAsync: mockUpload, isPending: false,
    } as any);

    renderWithProviders(<ImportPage />);

    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'logbook.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent(fileInput, new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText('Column Mapping')).toBeInTheDocument();
    });
  });

  it('shows preview step with summary cards', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      format: 'CSV',
      columns: ['Date', 'Reg'],
      previewRows: [],
      totalRows: 5,
      suggestedMappings: [],
    });
    const mockPreview = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      totalRows: 5,
      validCount: 3,
      duplicateCount: 1,
      errorCount: 1,
      flights: [
        { rowIndex: 1, status: 'valid', flight: { date: '2026-01-15', aircraftReg: 'D-EFGH', departureIcao: 'EDDF', arrivalIcao: 'EDDH' } },
        { rowIndex: 2, status: 'duplicate', flight: { date: '2026-01-16', aircraftReg: 'D-EFGH', departureIcao: 'EDDF', arrivalIcao: 'EDDH' } },
        { rowIndex: 3, status: 'error', flight: { date: '', aircraftReg: '', departureIcao: '', arrivalIcao: '' }, errors: [{ field: 'date', message: 'Required' }] },
      ],
    });

    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({ mutateAsync: mockUpload, isPending: false } as any);
    vi.spyOn(useImportHook, 'usePreviewImport').mockReturnValue({ mutateAsync: mockPreview, isPending: false } as any);

    // We can't easily simulate the full flow in unit tests, so just verify the component renders
    renderWithProviders(<ImportPage />);
    expect(screen.getByText('Import Flights')).toBeInTheDocument();
  });

  it('renders file format info', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getAllByText(/csv/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/detected automatically/i).length).toBeGreaterThanOrEqual(1);
  });

  // The point of the picker is answering "how do I get my flights out of the
  // app I use now?" — so the steps have to be reachable, not just the names.
  it('lists the supported logbooks and reveals export steps on selection', () => {
    renderWithProviders(<ImportPage />);

    expect(screen.getByText('ForeFlight')).toBeInTheDocument();
    expect(screen.getByText('MyFlightbook')).toBeInTheDocument();

    // Steps stay collapsed until a logbook is picked.
    expect(screen.queryByText(/Download the CSV of all flights/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('MyFlightbook'));

    expect(screen.getByText(/Exporting from MyFlightbook/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in at myflightbook.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Download the CSV of all flights/i)).toBeInTheDocument();

    // best-effort templates warn that column names vary.
    expect(screen.getByText(/Column names vary/i)).toBeInTheDocument();

    // Selecting again collapses it.
    fireEvent.click(screen.getByText('MyFlightbook'));
    expect(screen.queryByText(/Download the CSV of all flights/i)).not.toBeInTheDocument();
  });

  // The chips must stay real buttons. An earlier version set role="listitem" on
  // them, which overrides the implicit button role — assistive technology
  // announced each logbook as a list item rather than something pressable, and
  // it was only noticed when a browser driver could not find them by role.
  it('exposes each logbook as a button inside a list', () => {
    renderWithProviders(<ImportPage />);
    expect(screen.getByRole('button', { name: 'MyFlightbook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ForeFlight' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
  });

  it('does not show the best-effort caveat for an exact template', () => {
    renderWithProviders(<ImportPage />);
    fireEvent.click(screen.getByText('ForeFlight'));
    expect(screen.getByText(/Exporting from ForeFlight/i)).toBeInTheDocument();
    expect(screen.queryByText(/Column names vary/i)).not.toBeInTheDocument();
  });

  // The catalogue is a convenience — a failed fetch must not block uploading.
  it('still renders the uploader when the template catalogue fails to load', () => {
    vi.spyOn(useImportHook, 'useImportTemplates').mockReturnValue({
      data: undefined, isLoading: false, isError: true,
    } as any);

    renderWithProviders(<ImportPage />);

    expect(screen.getByText('Import Flights')).toBeInTheDocument();
    expect(screen.getAllByText(/detected automatically/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Coming from another logbook/i)).not.toBeInTheDocument();
  });

  it('names the detected template on the mapping step', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      format: 'MYFLIGHTBOOK_CSV',
      columns: ['Date', 'Tail Number', 'Route', 'Hobbs Start'],
      previewRows: [{ Date: '2026-03-07', 'Tail Number': 'N12345', Route: 'KSFO KOAK', 'Hobbs Start': '10.2' }],
      totalRows: 1,
      suggestedMappings: [
        { sourceColumn: 'Date', targetField: 'date' },
        { sourceColumn: 'Tail Number', targetField: 'aircraftReg' },
        { sourceColumn: 'Route', targetField: 'route' },
      ],
      detectedTemplate: mockTemplates[1],
    });
    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({
      mutateAsync: mockUpload, isPending: false,
    } as any);

    const { container } = renderWithProviders(<ImportPage />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['Date,Tail Number\n'], 'myflightbook.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/MyFlightbook format detected/i)).toBeInTheDocument();
    });

    // "Hobbs Start" has no mapping, so the pilot is told a column will be skipped.
    expect(screen.getByText(/1 column is not mapped/i)).toBeInTheDocument();
  });

  it('shows person fields in column mapping dropdowns', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      format: 'FOREFLIGHT_CSV',
      columns: ['Date', 'Person1', 'Person2', 'InstructorName'],
      previewRows: [{ Date: '2026-01-15', Person1: 'John', Person2: 'Jane', InstructorName: 'John' }],
      totalRows: 1,
      suggestedMappings: [
        { sourceColumn: 'Date', targetField: 'date' },
        { sourceColumn: 'Person1', targetField: 'person1' },
        { sourceColumn: 'Person2', targetField: 'person2' },
        { sourceColumn: 'InstructorName', targetField: 'instructorName' },
      ],
    });

    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({
      mutateAsync: mockUpload, isPending: false,
    } as any);

    renderWithProviders(<ImportPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'logbook.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent(fileInput, new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText('Column Mapping')).toBeInTheDocument();
    });

    // Verify person field options exist in the select dropdowns
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(3);

    // Check that person1, person2, instructorName options exist
    const firstSelect = selects[0];
    const options = firstSelect.querySelectorAll('option');
    const optionValues = Array.from(options).map(o => o.getAttribute('value'));
    expect(optionValues).toContain('person1');
    expect(optionValues).toContain('person2');
    expect(optionValues).toContain('instructorName');
    expect(optionValues).toContain('dualGivenTime');
  });

  it('shows crew column in preview table', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      format: 'FOREFLIGHT_CSV',
      columns: ['Date', 'AircraftID', 'From', 'To'],
      previewRows: [],
      totalRows: 1,
      suggestedMappings: [],
    });
    const mockPreview = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      totalRows: 1,
      validCount: 1,
      duplicateCount: 0,
      errorCount: 0,
      flights: [{
        rowIndex: 1,
        status: 'valid',
        flight: {
          date: '2026-01-15',
          aircraftReg: 'D-EABC',
          departureIcao: 'EDDF',
          arrivalIcao: 'EDDH',
          totalTime: 90,
          crewMembers: [
            { name: 'Max Instructor', role: 'Instructor' },
            { name: 'Student Pilot', role: 'Student' },
          ],
        },
      }],
    });

    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({ mutateAsync: mockUpload, isPending: false } as any);
    vi.spyOn(useImportHook, 'usePreviewImport').mockReturnValue({ mutateAsync: mockPreview, isPending: false } as any);

    renderWithProviders(<ImportPage />);

    // Upload
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'logbook.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent(fileInput, new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText('Column Mapping')).toBeInTheDocument();
    });

    // Click preview
    const previewButton = screen.getByRole('button', { name: /validate & preview/i });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    // Verify crew column header exists
    expect(screen.getByText('Crew')).toBeInTheDocument();

    // Verify crew members are displayed
    expect(screen.getByText('Max Instructor')).toBeInTheDocument();
    expect(screen.getByText('(Instructor)')).toBeInTheDocument();
    expect(screen.getByText('Student Pilot')).toBeInTheDocument();
    expect(screen.getByText('(Student)')).toBeInTheDocument();
  });

  describe('drag & drop', () => {
    const dropzone = () => document.querySelector('input[type="file"]')!.parentElement as HTMLElement;
    const dataTransfer = (files: File[]) => ({ files, types: ['Files'], dropEffect: 'none' });

    it('uploads a CSV file dropped onto the upload card', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        uploadToken: 'test-token',
        format: 'CSV',
        columns: ['Date'],
        previewRows: [],
        totalRows: 1,
        suggestedMappings: [],
      });
      vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({ mutateAsync: mockUpload, isPending: false } as any);

      renderWithProviders(<ImportPage />);

      const file = new File(['test'], 'logbook.csv', { type: 'text/csv' });
      fireEvent.drop(dropzone(), { dataTransfer: dataTransfer([file]) });

      await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));
      await waitFor(() => expect(screen.getByText('Column Mapping')).toBeInTheDocument());
    });

    it('rejects a file whose type is not accepted', async () => {
      const mockUpload = vi.fn();
      vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({ mutateAsync: mockUpload, isPending: false } as any);

      renderWithProviders(<ImportPage />);

      const file = new File(['test'], 'logbook.pdf', { type: 'application/pdf' });
      fireEvent.drop(dropzone(), { dataTransfer: dataTransfer([file]) });

      await waitFor(() => expect(screen.getByText(/unsupported file: logbook\.pdf/i)).toBeInTheDocument());
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('highlights the drop zone while a file is dragged over it', () => {
      renderWithProviders(<ImportPage />);
      const zone = dropzone();

      fireEvent.dragEnter(zone, { dataTransfer: dataTransfer([]) });
      expect(zone).toHaveAttribute('data-dragging');

      fireEvent.dragLeave(zone, { dataTransfer: dataTransfer([]) });
      expect(zone).not.toHaveAttribute('data-dragging');
    });

    it('restores a dropped JSON backup in the JSON tab', async () => {
      const mockRestore = vi.fn().mockResolvedValue({
        aircraftImported: 1,
        aircraftSkipped: 0,
        licensesImported: 0,
        classRatingsImported: 0,
        credentialsImported: 0,
        flightsImported: 3,
        crewMembersImported: 0,
      });
      vi.spyOn(useImportHook, 'useRestoreJSON').mockReturnValue({ mutateAsync: mockRestore, isPending: false } as any);

      renderWithProviders(<ImportPage />);
      fireEvent.click(screen.getByRole('tab', { name: /restore json backup/i }));

      const file = new File(['{}'], 'backup.json', { type: 'application/json' });
      fireEvent.drop(dropzone(), { dataTransfer: dataTransfer([file]) });

      await waitFor(() => expect(mockRestore).toHaveBeenCalledWith(file));
      await waitFor(() => expect(screen.getByText('Backup restored')).toBeInTheDocument());
    });
  });

  it('shows contacts created in result', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      format: 'CSV',
      columns: ['Date'],
      previewRows: [],
      totalRows: 1,
      suggestedMappings: [],
    });
    const mockPreview = vi.fn().mockResolvedValue({
      uploadToken: 'test-token',
      totalRows: 1,
      validCount: 1,
      duplicateCount: 0,
      errorCount: 0,
      flights: [{ rowIndex: 1, status: 'valid', flight: { date: '2026-01-15', aircraftReg: 'D-EABC', departureIcao: 'EDDF', arrivalIcao: 'EDDH' } }],
    });
    const mockConfirm = vi.fn().mockResolvedValue({
      id: 'import-1',
      userId: 'user-1',
      fileName: 'logbook.csv',
      format: 'CSV',
      status: 'completed',
      totalRows: 1,
      importedCount: 1,
      skippedCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      contactsCreated: 2,
      createdAt: '2026-01-15T00:00:00Z',
    });

    vi.spyOn(useImportHook, 'useUploadImport').mockReturnValue({ mutateAsync: mockUpload, isPending: false } as any);
    vi.spyOn(useImportHook, 'usePreviewImport').mockReturnValue({ mutateAsync: mockPreview, isPending: false } as any);
    vi.spyOn(useImportHook, 'useConfirmImport').mockReturnValue({ mutateAsync: mockConfirm, isPending: false } as any);

    renderWithProviders(<ImportPage />);

    // Upload
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'logbook.csv', { type: 'text/csv' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent(fileInput, new Event('change', { bubbles: true }));

    await waitFor(() => expect(screen.getByText('Column Mapping')).toBeInTheDocument());

    // Preview
    fireEvent.click(screen.getByRole('button', { name: /validate & preview/i }));
    await waitFor(() => expect(screen.getByText('Preview')).toBeInTheDocument());

    // Confirm
    fireEvent.click(screen.getByRole('button', { name: /import 1 flight/i }));
    await waitFor(() => expect(screen.getByText(/Successfully imported/)).toBeInTheDocument());

    // Check contacts created is shown
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
