import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Suite } from '../../api/types';
import { createSuite } from '../../api/suites';
import { importCasesCsv } from '../../api/csv';
import { Button } from '../../components/Button';
import { Field, Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { downloadTableAsCsv } from '../../lib/downloadCsv';

export function ProjectCsvImport({ projectId, suites, canManage }: {
  projectId: string; suites: Suite[]; canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [suiteId, setSuiteId] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const importer = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a CSV file.');
      const csv = await file.text();
      if (!csv.trim()) throw new Error('The CSV file is empty.');
      let targetId = suiteId;
      if (!targetId) {
        const { suite } = await createSuite(projectId, { name: name.trim() });
        targetId = suite.id;
        // Keep the created target on failure so retrying does not create another suite.
        setSuiteId(targetId);
        await queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      }
      return { ...await importCasesCsv(targetId, csv), targetId };
    },
    onSuccess: ({ imported, targetId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['suites', targetId] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      showToast(`Imported ${imported} test case${imported === 1 ? '' : 's'}.`, 'success');
      setOpen(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to import CSV'),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    importer.mutate();
  }
  return <>
    <Button variant="secondary" disabled={!canManage && suites.length === 0} onClick={() => {
      setSuiteId(suites[0]?.id ?? ''); setName(''); setFile(null); setError(null); setOpen(true);
    }}>Import CSV</Button>
    <Modal open={open} title="Import test cases" onClose={() => { if (!importer.isPending) setOpen(false); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Upload your TestForge CSV template. Section hierarchies are created automatically. Imports add new cases; uploading the same file again can create duplicates.</p>
        <Field>
          <Label htmlFor="import-suite">Destination suite</Label>
          <Select id="import-suite" value={suiteId} disabled={importer.isPending} onChange={(event) => setSuiteId(event.target.value)}>
            {suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.name}</option>)}
            {canManage && <option value="">Create a new suite</option>}
          </Select>
        </Field>
        {!suiteId && canManage && <Field>
          <Label htmlFor="import-suite-name">New suite name</Label>
          <Input id="import-suite-name" required maxLength={200} value={name} disabled={importer.isPending} onChange={(event) => setName(event.target.value)} />
        </Field>}
        <Field>
          <Label htmlFor="import-csv-file">CSV file</Label>
          <Input id="import-csv-file" type="file" accept=".csv,text/csv" required disabled={importer.isPending} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
        <Button type="button" variant="ghost" onClick={() => downloadTableAsCsv(
          ['Sections Hierarchy', 'title', 'priority', 'type', 'preconditions', 'steps', 'expectedResult', 'referenceLink'],
          [], 'testforge-template.csv',
        )}>Download CSV template</Button>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={importer.isPending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={importer.isPending || !file || (!suiteId && (!canManage || !name.trim()))}>{importer.isPending ? 'Importing...' : 'Import cases'}</Button>
        </div>
      </form>
    </Modal>
  </>;
}
