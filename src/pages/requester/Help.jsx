import { Button, Card, PageHeader, SafetyCard } from '../../components/ui.jsx';
import { useStore } from '../../context/StoreContext.jsx';

const TIPS = [
  {
    icon: 'edit',
    title: 'Describe the problem',
    points: [
      'Say what you see, hear or smell: "Ceiling AC dripping water onto the desk", not just "AC broken".',
      'Mention when it started and whether it is getting worse.',
      'Include any error codes, labels or asset tags you can see on the equipment.',
    ],
  },
  {
    icon: 'mapPin',
    title: 'Give the exact location',
    points: [
      'Pick the building and room in the form.',
      'Add details that help a technician find it quickly: floor, wing, "left of the door", "unit above desk 4".',
      'Say whether the area is locked or needs an escort.',
    ],
  },
  {
    icon: 'image',
    title: 'Attach photos when you can',
    points: [
      'A clear photo of the problem and one showing where it is in the room both help.',
      'Never take photos if doing so puts you at risk.',
    ],
  },
  {
    icon: 'clock',
    title: 'After you submit',
    points: [
      'Your request is analyzed and sent to the right team. Track it in My Requests.',
      'You will see the scheduled service time once a visit is booked.',
      'If the problem gets worse or becomes unsafe, treat it as an emergency.',
    ],
  },
];

// PB-35: help for writing a good request plus urgent-vs-routine guidance.
export default function Help() {
  const { emergencyContact, supportSettings = {} } = useStore();

  return (
    <div className="page-inner">
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/requester' }, { label: 'Help & Support' }]}
        title="Help & Support"
        subtitle="How to report a routine maintenance issue, and what to do when it's urgent."
      />

      <div className="review-grid">
        <div className="stack gap-16">
          {TIPS.map((tip) => (
            <Card key={tip.title} title={tip.title} icon={tip.icon}>
              <ul className="help-list">
                {tip.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </Card>
          ))}
        </div>

        <div className="stack gap-16">
          <SafetyCard contact={emergencyContact} showRoutine />
          <Card title="Routine requests" icon="filePlus">
            <p className="muted" style={{ fontSize: 14, lineHeight: '21px' }}>
              {supportSettings.routineInfo || 'Use New Request for anything that is not an emergency: broken fixtures, comfort issues, equipment faults and similar problems.'}
            </p>
            <Button icon="plus" to="/requester/new" style={{ marginTop: 12 }}>New Request</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
