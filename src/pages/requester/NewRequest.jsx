
import { configured, db } from '../../firebase.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {
  Button,
  Field,
  Input,
  PageHeader,
  SafetyCard,
  Textarea
} from '../../components/ui.jsx';
import {
  RequestTips,
  WhatHappensNext
} from '../../components/RequestBlocks.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { EMERGENCY_PHONE } from '../../data/mock.js';

const MAX_CHARS = 500;
const MAX_BYTES = 5 * 1024 * 1024;

export default function NewRequest() {
  const { user } = useAuth();
  const { submitRequest, buildings = [] } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    description: '',
    buildingId: '',
    roomId: '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [drag, setDrag] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: ''
    }));
  };

  // Load rooms whenever a building is selected.
  useEffect(() => {
    if (!configured || !form.buildingId) {
      setRooms([]);
      setRoomsLoading(false);
      return;
    }

    setRooms([]);
    setRoomsLoading(true);

    const unsubscribe = onSnapshot(
      collection(
        db,
        'buildings',
        form.buildingId,
        'rooms'
      ),
      (snapshot) => {
        const roomList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        setRooms(roomList);
        setRoomsLoading(false);
      },
      (error) => {
        console.error('Failed to load rooms:', error);
        setRooms([]);
        setRoomsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [form.buildingId]);

  // Changing the building resets the selected room.
  const changeBuilding = (event) => {
    const buildingId = event.target.value;

    setForm((previous) => ({
      ...previous,
      buildingId,
      roomId: ''
    }));

    setRooms([]);

    setErrors((previous) => ({
      ...previous,
      buildingId: '',
      roomId: ''
    }));
  };

  // Handle image selection.
  const addFiles = (files) => {
    const accepted = [];

    for (const file of files) {
      if (!/image\/(png|jpe?g)/.test(file.type)) {
        toast(
          `${file.name}: only PNG or JPG files are allowed.`,
          'error'
        );
        continue;
      }

      if (file.size > MAX_BYTES) {
        toast(
          `${file.name} is larger than 5MB.`,
          'error'
        );
        continue;
      }

      accepted.push({
        url: URL.createObjectURL(file),
        name: file.name
      });
    }

    setPhotos((previous) => [
      ...previous,
      ...accepted
    ]);
  };

  const removePhoto = (index) => {
    setPhotos((previous) => {
      const photo = previous[index];

      if (photo) {
        URL.revokeObjectURL(photo.url);
      }

      return previous.filter((_, i) => i !== index);
    });
  };

  // Validate required fields.
  const validate = () => {
    const validationErrors = {};

    if (form.description.trim().length < 10) {
      validationErrors.description =
        'Please describe the problem (at least 10 characters).';
    }

    const selectedBuilding = buildings.find(
      (building) =>
        building.id === form.buildingId &&
        building.active
    );

    if (!selectedBuilding) {
      validationErrors.buildingId =
        'Please select an active building.';
    }

    const selectedRoom = rooms.find(
      (room) =>
        room.id === form.roomId &&
        room.active
    );

    if (!selectedRoom) {
      validationErrors.roomId =
        'Please select an active room.';
    }

    if (
      form.email &&
      !/^\S+@\S+\.\S+$/.test(form.email)
    ) {
      validationErrors.email =
        'Enter a valid email address.';
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  // Submit maintenance request.
  const onSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        description: form.description.trim(),
        buildingId: form.buildingId,
        roomId: form.roomId,
        phone: form.phone.trim(),
        email: form.email.trim(),
        photos: []
      };

      console.log(
        'Submitting maintenance request:',
        payload
      );

      const result = await submitRequest(payload, user);

      const id = typeof result === 'string'
        ? result
        : result?.id;

      if (!id) {
        throw new Error(
          'Request submitted, but no request ID was returned.'
        );
      }

      navigate(`/requester/requests/${id}`, {
        state: {
          justSubmitted: true
        }
      });
    } catch (error) {
      console.error(
        'Maintenance request submission failed:',
        error
      );

      toast(
        error.message || 'Unable to submit request.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-inner">
      <div className="two-col wide-right">
        <form
          className="stack gap-20"
          onSubmit={onSubmit}
          noValidate
        >
          <PageHeader
            breadcrumbs={[
              {
                label: 'Home',
                to: '/requester'
              },
              {
                label: 'New Request'
              }
            ]}
            title="Submit a Maintenance Request"
            subtitle="Describe the problem in your own words. You don’t need to choose a category - we’ll take care of that."
          />

          <div className="card">
            <div
              className="card-body stack gap-16"
              style={{ paddingTop: 20 }}
            >
              {/* DESCRIPTION */}
              <Field
                label="Description"
                required
                htmlFor="desc"
                error={errors.description}
              >
                <Textarea
                  id="desc"
                  rows={4}
                  maxLength={MAX_CHARS}
                  value={form.description}
                  onChange={set('description')}
                  invalid={!!errors.description}
                  placeholder="e.g. The air conditioner in room 204 is not cooling and is making a loud noise."
                />

                <span className="char-count">
                  {form.description.length}/{MAX_CHARS}
                </span>
              </Field>

              {/* BUILDING */}
              <Field
                label="Building"
                required
                htmlFor="building"
                error={errors.buildingId}
              >
                <select
                  id="building"
                  required
                  value={form.buildingId}
                  onChange={changeBuilding}
                  className="input"
                  style={{
                    width: '100%',
                    padding: 12
                  }}
                >
                  <option value="">
                    Select a building
                  </option>

                  {buildings
                    .filter((building) => building.active)
                    .map((building) => (
                      <option
                        key={building.id}
                        value={building.id}
                      >
                        {building.name}
                      </option>
                    ))}
                </select>
              </Field>

              {/* ROOM */}
              <Field
                label="Room"
                required
                htmlFor="room"
                error={errors.roomId}
              >
                <select
                  id="room"
                  required
                  value={form.roomId}
                  onChange={set('roomId')}
                  disabled={
                    !form.buildingId ||
                    roomsLoading
                  }
                  className="input"
                  style={{
                    width: '100%',
                    padding: 12
                  }}
                >
                  <option value="">
                    {roomsLoading
                      ? 'Loading rooms...'
                      : !form.buildingId
                        ? 'Select a building first'
                        : 'Select a room'}
                  </option>

                  {rooms
                    .filter((room) => room.active)
                    .map((room) => (
                      <option
                        key={room.id}
                        value={room.id}
                      >
                        {room.name}
                      </option>
                    ))}
                </select>

                {form.buildingId &&
                  !roomsLoading &&
                  rooms.filter((room) => room.active)
                    .length === 0 && (
                    <p className="field-hint">
                      No active rooms are available
                      in this building. Contact an
                      administrator.
                    </p>
                  )}
              </Field>

              {/* ADDITIONAL DETAILS */}
              <div
                className="stack gap-8"
                style={{ marginTop: 14 }}
              >
                <h2
                  className="section-title"
                  style={{ fontSize: 17 }}
                >
                  Additional Details (Optional)
                </h2>

                <div className="attach">
                  <div className="attach-label">
                    Attach Photos
                  </div>

                  <div className="attach-row">
                    <div
                      className={`dropzone ${drag ? 'drag' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        fileRef.current?.click()
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === 'Enter' ||
                          event.key === ' '
                        ) {
                          event.preventDefault();
                          fileRef.current?.click();
                        }
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDrag(true);
                      }}
                      onDragLeave={() => {
                        setDrag(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDrag(false);
                        addFiles(event.dataTransfer.files);
                      }}
                    >
                      <Icon
                        name="upload"
                        size={30}
                      />

                      <div>
                        <span className="link">
                          Click to upload
                        </span>
                        {' '}or drag and drop
                      </div>

                      <div className="dropzone-sub">
                        PNG, JPG up to 5MB
                      </div>

                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        multiple
                        hidden
                        onChange={(event) => {
                          addFiles(event.target.files);
                          event.target.value = '';
                        }}
                      />
                    </div>

                    {photos.map((photo, index) => (
                      <div
                        key={photo.url}
                        className="photo-thumb"
                      >
                        <img
                          src={photo.url}
                          alt={photo.name}
                        />

                        <button
                          type="button"
                          className="photo-remove"
                          aria-label={`Remove ${photo.name}`}
                          onClick={() =>
                            removePhoto(index)
                          }
                        >
                          <Icon
                            name="x"
                            size={12}
                            strokeWidth={3.5}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CONTACT INFORMATION */}
              <div
                className="stack gap-12"
                style={{ marginTop: 8 }}
              >
                <div>
                  <h2
                    className="section-title"
                    style={{ fontSize: 17 }}
                  >
                    Contact Information (Optional)
                  </h2>

                  <p
                    className="field-hint"
                    style={{
                      fontSize: 14,
                      marginTop: 4
                    }}
                  >
                    We’ll use this if we need more
                    information about your request.
                  </p>
                </div>

                <div className="form-grid-2">
                  <Field
                    label="Phone Number"
                    htmlFor="phone"
                  >
                    <Input
                      id="phone"
                      icon="phone"
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                    />
                  </Field>

                  <Field
                    label="Email Address"
                    htmlFor="email"
                    error={errors.email}
                  >
                    <Input
                      id="email"
                      icon="mail"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      invalid={!!errors.email}
                    />
                  </Field>
                </div>
              </div>

              {/* ACTIONS */}
              <div
                className="btn-row"
                style={{ marginTop: 6 }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() =>
                    navigate('/requester')
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  icon="send"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit Request'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        <div
          className="right-col"
          style={{ paddingTop: 12 }}
        >
          <WhatHappensNext />
          <RequestTips />
          <SafetyCard phone={EMERGENCY_PHONE} />
        </div>
      </div>
    </div>
  );
}
