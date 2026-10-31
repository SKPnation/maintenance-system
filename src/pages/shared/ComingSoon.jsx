import { PageHeader, EmptyState } from '../../components/ui.jsx';

export default function ComingSoon({ title, text }) {
  return (
    <div className="page-inner">
      <PageHeader title={title} subtitle={text} />
      <div className="card coming-soon">
        <EmptyState icon="wrench" title="This screen hasn't been designed yet" text="It's in the navigation so the structure is complete. Add the page component and route it in App.jsx." />
      </div>
    </div>
  );
}
