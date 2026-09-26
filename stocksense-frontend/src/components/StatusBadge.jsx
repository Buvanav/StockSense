import { Clock, CheckCircle2, AlertCircle, FileText, XCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const s = status ? status.toLowerCase() : 'draft';

  const icons = {
    draft: <FileText size={12} />,
    waiting: <Clock size={12} />,
    ready: <AlertCircle size={12} />,
    done: <CheckCircle2 size={12} />,
    canceled: <XCircle size={12} />,
  };

  return (
    <span className={`badge ${s}`}>
      {icons[s] || null}
      {status}
    </span>
  );
}
