
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';

import Icon from '../../components/Icon.jsx';
import {
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatusPill,
} from '../../components/ui.jsx';

import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { db, configured } from '../../firebase.js';
import { EMERGENCY_PHONE } from '../../data/mock.js';
import { fmtDateTime } from '../../data/format.js';
import { REQUEST_STAGE } from '../../components/RequestBlocks.jsx';

// Convert Firestore timestamps and date strings into Date objects.
function toDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// Format dates without displaying "undefined NaN".
function formatRequestDate(value) {
  const date = toDate(value);

  if (!date) return 'Not available';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Normalize request statuses from Firestore.
function normalizeStatus(status) {
  if (!status) return 'Submitted';

  const statuses = {
    submitted: 'Submitted',
    pending: 'Pending',
    analyzed: 'Analyzed',
    routed: 'Routed',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return statuses[String(status).toLowerCase()] || status;
}

export default function RequestDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const { requests } = useStore();
  const toast = useToast();

  const [liveRequest, setLiveRequest] = useState(null);
  const [loading, setLoading] = useState(Boolean(configured));
  const [loadError, setLoadError] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [roomName, setRoomName] = useState('');

  // Subscribe to the individual request document.
  useEffect(() => {
    if (!configured || !db || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    setLiveRequest(null);

    const unsubscribe = onSnapshot(
      doc(db, 'requests', id),
      (snapshot) => {
        if (snapshot.exists()) {
          setLiveRequest({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setLiveRequest(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error('Request listener failed:', error);
        setLoadError(error.message || 'Unable to load request.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Resolve building and room names from their Firestore IDs.
  useEffect(() => {
    setBuildingName('');
    setRoomName('');

    if (!configured || !db || !liveRequest?.buildingId) return;

    const buildingId = liveRequest.buildingId;
    const roomId = liveRequest.roomId;

    const unsubscribeBuilding = onSnapshot(
      doc(db, 'buildings', buildingId),
      (snapshot) => {
        if (snapshot.exists()) {
          setBuildingName(snapshot.data().name || buildingId);
        } else {
          setBuildingName(buildingId);
        }
      },
      (error) => {
        console.error('Building listener failed:', error);
        setBuildingName(buildingId);
      }
    );

    let unsubscribeRoom = () => {};

    if (roomId) {
      unsubscribeRoom = onSnapshot(
        doc(db, 'buildings', buildingId, 'rooms', roomId),
        (snapshot) => {
          if (snapshot.exists()) {
            setRoomName(snapshot.data().name || roomId);
          } else {
            setRoomName(roomId);
          }
        },
        (error) => {
          console.error('Room listener failed:', error);
          setRoomName(roomId);
        }
      );
    }

    return () => {
      unsubscribeBuilding();
      unsubscribeRoom();
    };
  }, [liveRequest?.buildingId, liveRequest?.roomId]);

  // In Firebase mode, prefer the live Firestore document.
  const storeRequest = requests.find((r) => r.id === id);
  const req = configured ? liveRequest : storeRequest;

  if (loading) {
    return (
      <div className="page-inner">
        <Card title="Request Details">
          <p>Loading your maintenance request...</p>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-inner">
        <div className="card">
          <EmptyState
            icon="fileText"
            title="Unable to load request"
            text={loadError}
            action={
              <Button to="/requester/requests">
                Back to My Requests
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="page-inner">
        <div className="card">
          <EmptyState
            icon="fileText"
            title="Request not found"
            text={`We couldn't find ${id}.`}
            action={
              <Button to="/requester/requests">
                Back to My Requests
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const justSubmitted = state?.justSubmitted;

  const status = normalizeStatus(req.status);
  const stage = REQUEST_STAGE[status] ?? 0;
  const rejected = status === 'Rejected';

  // AI analysis is tracked separately from the request status.
  const analysisStatus = req.analysisStatus || (
    !configured && stage >= 2 ? 'completed' : 'pending'
  );

  const analysisCompleted = analysisStatus === 'completed';
  const analysisFailed = analysisStatus === 'failed';
  const analysisProcessing = analysisStatus === 'processing';

  // A request is routed only when a category has been assigned.
  const routedCategory =
    req.routedCategory ||
    req.ai?.category ||
    req.category ||
    '';

  const routingCompleted =
    Boolean(routedCategory) && analysisCompleted;

  const managerReviewStarted =
    ['Under Review', 'Approved', 'Rejected', 'Scheduled',
      'In Progress', 'Completed'].includes(status);

  const managerApproved =
    ['Approved', 'Scheduled', 'In Progress', 'Completed'].includes(status);

  const workOrderCreated =
    Boolean(req.workOrderId) ||
    ['Scheduled', 'In Progress', 'Completed'].includes(status);

  const submittedDate = formatRequestDate(
    req.submittedAt || req.createdAt
  );

  const locationText = configured
    ? [
        buildingName || req.buildingId,
        roomName || req.roomId,
      ].filter(Boolean).join(' / ') || req.location || 'Not available'
    : req.location || 'Not available';

  const analysisMeta = analysisCompleted
    ? 'Completed'
    : analysisFailed
      ? 'Failed — Manual Review Required'
      : analysisProcessing
        ? 'In progress'
        : 'Pending';

  const routingMeta = routingCompleted
    ? `Routed to ${routedCategory}`
    : analysisFailed
      ? 'Manual routing required'
      : 'Pending';

  const managerMeta = rejected
    ? 'Rejected'
    : managerApproved
      ? 'Approved'
      : managerReviewStarted
        ? 'In progress'
        : 'Pending';

  const workOrderMeta = workOrderCreated
    ? status === 'Completed'
      ? 'Completed'
      : 'Created'
    : 'Pending';

  const track = [
    {
      title: 'Request Submitted',
      meta: submittedDate,
      text: 'Your request has been received.',
      completed: true,
    },
    {
      title: 'AI Analysis',
      meta: analysisMeta,
      text: analysisFailed
        ? 'Automatic analysis failed. Manual review is required.'
        : analysisCompleted
          ? 'Category, priority, and safety assessment completed.'
          : 'Classifying category, priority, and safety risks.',
      completed: analysisCompleted,
      failed: analysisFailed,
    },
    {
      title: 'Routing to Manager',
      meta: routingMeta,
      text: routingCompleted
        ? `Your request has been classified under ${routedCategory}.`
        : 'Your request will be sent to the appropriate team.',
      completed: routingCompleted,
    },
    {
      title: 'Manager Review',
      meta: managerMeta,
      text: 'The manager will review and may adjust the details.',
      completed: managerApproved || rejected,
    },
    {
      title: 'Work Order Created',
      meta: workOrderMeta,
      text: 'You’ll be notified once it’s approved and assigned.',
      completed: workOrderCreated,
    },
  ];

  // Determine which step is currently active.
  const currentIndex = track.findIndex((step) => !step.completed);

  const doneIndex =
    currentIndex === -1 ? track.length : currentIndex;

  const hsteps = [
    {
      icon: 'fileText',
      title: analysisCompleted
        ? 'AI analysis completed'
        : analysisFailed
          ? 'Manual analysis required'
          : 'Analyzing with AI',
      text: analysisCompleted
        ? 'Your request has been analyzed successfully.'
        : analysisFailed
          ? 'Automatic analysis failed. The request needs manual review.'
          : 'We’re classifying the category, priority, and safety risks.',
    },
    {
      icon: 'users',
      title: routingCompleted ? 'Category assigned' : 'Routing to team',
      text: routingCompleted
        ? `Category: ${routedCategory}`
        : 'Your request will be sent to the appropriate manager.',
    },
    {
      icon: 'clipboard',
      title: 'Manager review',
      text: 'The manager will review and may adjust the details.',
    },
    {
      icon: 'bell',
      title: 'You’ll be notified',
      text: 'You can track updates in My Requests.',
    },
  ];

  const hCurrent = analysisFailed
    ? 0
    : !analysisCompleted
      ? 0
      : !routingCompleted
        ? 1
        : !managerApproved
          ? 2
          : 3;

  const copy = () => {
    navigator.clipboard?.writeText(req.id);
    toast(`${req.id} copied`);
  };

  return (
    <div className="page-inner">
      <div
        className="two-col"
        style={{
          gridTemplateColumns: 'minmax(0,1fr) 356px',
          gap: 20,
        }}
      >
        <div className="stack gap-16">
          {justSubmitted ? (
            <>
              <Breadcrumbs
                items={[
                  { label: 'Home', to: '/requester' },
                  { label: 'New Request', to: '/requester/new' },
                  { label: 'Confirmation' },
                ]}
              />

              <section className="success" style={{ marginTop: -6 }}>
                <div className="success-check">
                  <Icon name="check" size={44} strokeWidth={3} />
                </div>

                <div>
                  <h1 className="success-title">
                    Request Submitted!
                  </h1>

                  <p className="success-sub">
                    Your maintenance request has been received.
                  </p>

                  <p className="success-desc">
                    {analysisCompleted
                      ? 'Your request has been analyzed and classified successfully.'
                      : analysisFailed
                        ? 'Your request was saved, but automatic analysis requires manual review.'
                        : 'We have saved your request and our system is now analyzing and routing it to the appropriate team.'}
                  </p>
                </div>

                <svg
                  className="success-art"
                  width="210"
                  height="140"
                  viewBox="0 0 210 140"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M18 30l8 8M2 64h14M18 98l8-8M178 22l-8 8M186 50h14"
                    stroke="#22A954"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <rect x="46" y="0" width="114" height="136" rx="8" fill="#FFFFFF" />
                  <rect x="66" y="26" width="72" height="10" rx="5" fill="#8DB2F2" />
                  <rect x="66" y="52" width="72" height="8" rx="4" fill="#8DB2F2" />
                  <rect x="66" y="76" width="48" height="8" rx="4" fill="#8DB2F2" />
                  <rect x="66" y="98" width="30" height="8" rx="4" fill="#8DB2F2" />
                  <circle cx="150" cy="96" r="24" fill="#22A954" />
                  <path
                    d="m139 97 7 7 14-14"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </section>
            </>
          ) : (
            <PageHeader
              breadcrumbs={[
                { label: 'Home', to: '/requester' },
                { label: 'My Requests', to: '/requester/requests' },
                { label: req.id },
              ]}
              title={req.id}
              badge={<StatusPill status={status} size="lg" />}
              subtitle={req.description}
            />
          )}

          <Card title="Request Details">
            <div className="detail-grid">
              <dl className="kv" style={{ flex: 1, maxWidth: 580 }}>
                <dt>Request Number</dt>
                <dd>
                  <span className="req-num">
                    {req.id}
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={copy}
                      aria-label="Copy request number"
                    >
                      <Icon name="copy" size={20} strokeWidth={2} />
                    </button>
                  </span>
                </dd>

                <dt>Status</dt>
                <dd><StatusPill status={status} /></dd>

                <dt>Submitted</dt>
                <dd>{submittedDate}</dd>

                <dt>Description</dt>
                <dd>{req.description}</dd>

                <dt>Location</dt>
                <dd>{locationText}</dd>

                <dt>Contact</dt>
                <dd>
                  {req.phone || 'Not provided'}
                  <br />
                  {req.email || 'Not provided'}
                </dd>

                {analysisCompleted && req.ai && (
                  <>
                    <dt>AI Category</dt>
                    <dd>{req.ai.category || 'Not available'}</dd>

                    <dt>Recommended Priority</dt>
                    <dd>{req.ai.priority || 'Not available'}</dd>

                    <dt>Recommended Trade</dt>
                    <dd>{req.ai.trade || 'Not available'}</dd>

                    <dt>Safety Risk Flag</dt>
                    <dd>
                      {req.ai.safetyFlag
                        ? 'Potential safety risk identified'
                        : 'No specific safety risk flagged'}
                    </dd>

                    <dt>Recommended Action</dt>
                    <dd>
                      {req.ai.suggestedAction || 'Not available'}
                    </dd>
                  </>
                )}

                {req.managerNote && (
                  <>
                    <dt>Manager note</dt>
                    <dd>{req.managerNote}</dd>
                  </>
                )}
              </dl>

              {req.photos?.[0] && (
                <img
                  className="photo detail-photo"
                  src={req.photos[0]}
                  alt="Attached photo"
                />
              )}
            </div>
          </Card>

          {!rejected && (
            <section className="next-strip">
              <h2 className="card-title">What happens next?</h2>

              <div className="hsteps">
                {hsteps.map((s, i) => (
                  <div key={s.title}>
                    <div className="hstep-top">
                      <div
                        className={`num ${
                          i < hCurrent
                            ? 'done'
                            : i === hCurrent
                              ? 'on'
                              : ''
                        }`}
                      >
                        {i < hCurrent ? (
                          <Icon name="check" size={18} strokeWidth={3} />
                        ) : (
                          i + 1
                        )}
                      </div>

                      <Icon
                        name={s.icon}
                        size={26}
                        strokeWidth={1.7}
                      />

                      {i < hsteps.length - 1 && (
                        <div className="hstep-dash" />
                      )}
                    </div>

                    <div className="hstep-title">{s.title}</div>
                    <div className="hstep-text">{s.text}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="btn-row">
            <Button
              variant="secondary"
              size="lg"
              icon="editDoc"
              to="/requester/new"
            >
              Submit Another Request
            </Button>

            <Button
              size="lg"
              icon="fileText"
              to="/requester/requests"
            >
              View My Requests
            </Button>
          </div>
        </div>

        <div className="right-col">
          <Card title="Track Your Request">
            <div className="timeline">
              {track.map((t, i) => (
                <div key={t.title} className="tl-item">
                  <div className="tl-rail">
                    <div
                      className={`tl-dot ${
                        t.completed
                          ? 'done'
                          : i === doneIndex
                            ? 'on'
                            : ''
                      }`}
                    >
                      {t.completed && (
                        <Icon
                          name="check"
                          size={14}
                          strokeWidth={3}
                          style={{ color: '#fff' }}
                        />
                      )}
                    </div>

                    {i < track.length - 1 && (
                      <div className="tl-line" />
                    )}
                  </div>

                  <div className="tl-body">
                    <div className="tl-title">{t.title}</div>
                    <div className="tl-meta">{t.meta}</div>
                    <div className="tl-text">{t.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <section className="sos help-card">
            <div className="sos-row">
              <div className="sos-icon">
                <Icon name="headset" size={26} strokeWidth={2} />
              </div>

              <div>
                <h3 className="sos-title">Need Help?</h3>

                <p className="sos-text" style={{ fontSize: 14 }}>
                  If this is an urgent safety issue (e.g. gas leak,
                  fire, electrical hazard), please contact facilities
                  immediately.
                </p>
              </div>
            </div>

            <a
              className="sos-phone"
              href={`tel:${EMERGENCY_PHONE.replace(/\D/g, '')}`}
            >
              <Icon name="phone" size={26} />
              <span>{EMERGENCY_PHONE}</span>
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
