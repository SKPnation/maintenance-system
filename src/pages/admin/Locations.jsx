
import {useEffect, useState} from 'react';
import {collection, onSnapshot} from 'firebase/firestore';
import {db, api} from '../../firebase.js';

const emptyRoom = {name: '', active: true};

export default function Locations() {
  const [buildings, setBuildings] = useState([]);
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [id, setId] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [rooms, setRooms] = useState([]);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(
      collection(db, 'buildings'),
      snapshot => setBuildings(
        snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
      ),
      err => setError(err.message)
    );
  }, []);

  useEffect(() => {
    if (!selectedBuilding) {
      setRooms([]);
      return;
    }

    return onSnapshot(
      collection(db, 'buildings', selectedBuilding, 'rooms'),
      snapshot => setRooms(
        snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
      ),
      err => setError(err.message)
    );
  }, [selectedBuilding]);

  async function saveBuilding(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await api('saveBuilding', {
        id: id || undefined,
        name: name.trim(),
        active
      });
      setName('');
      setId('');
      setActive(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBuilding(building) {
    if (!window.confirm(`Delete ${building.name}?`)) return;

    setBusy(true);
    setError('');

    try {
      await api('deleteBuilding', {id: building.id});
      if (selectedBuilding === building.id) {
        setSelectedBuilding('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRoom(e) {
    e.preventDefault();
    if (!selectedBuilding) return;

    setBusy(true);
    setError('');

    try {
      await api('saveRoom', {
        buildingId: selectedBuilding,
        id: roomId || undefined,
        name: roomForm.name.trim(),
        active: roomForm.active
      });

      setRoomForm(emptyRoom);
      setRoomId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteRoom(room) {
    if (!window.confirm(`Delete ${room.name}?`)) return;

    setBusy(true);
    setError('');

    try {
      await api('deleteRoom', {
        buildingId: selectedBuilding,
        id: room.id
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = {
    padding: 12,
    border: '1px solid #cbd5e1',
    borderRadius: 8
  };

  return (
    <div className="page-inner">
      <h1 className="page-title">Maintenance Locations</h1>
      <p className="page-subtitle">
        Manage buildings and their rooms for maintenance requests.
      </p>

      <div className="card" style={{padding: 24, marginTop: 20}}>
        <h3>{id ? 'Edit Building' : 'Add Building'}</h3>

        <form onSubmit={saveBuilding} style={{
          display: 'flex', gap: 12, flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            required
            placeholder="Building name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={fieldStyle}
          />

          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
            />
            {' '}Active
          </label>

          <button className="btn btn-primary" disabled={busy}>
            {id ? 'Update Building' : 'Add Building'}
          </button>

          {id && (
            <button type="button" className="btn" onClick={() => {
              setId('');
              setName('');
              setActive(true);
            }}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card" style={{padding: 24, marginTop: 20}}>
        <h3>Buildings ({buildings.length})</h3>

        {buildings.map(building => (
          <div key={building.id} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 12,
            padding: 12, borderBottom: '1px solid #ddd',
            flexWrap: 'wrap'
          }}>
            <span>
              <strong>{building.name}</strong>
              {' — '}
              {building.active ? 'Active' : 'Inactive'}
            </span>

            <div style={{display: 'flex', gap: 8}}>
              <button className="btn" onClick={() => {
                setSelectedBuilding(building.id);
                setRoomId('');
                setRoomForm(emptyRoom);
              }}>
                Manage Rooms
              </button>

              <button className="btn" onClick={() => {
                setId(building.id);
                setName(building.name);
                setActive(building.active);
              }}>
                Edit
              </button>

              <button className="btn" disabled={busy}
                onClick={() => deleteBuilding(building)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedBuilding && (
        <div className="card" style={{padding: 24, marginTop: 20}}>
          <h3>
            Rooms — {buildings.find(b => b.id === selectedBuilding)?.name}
          </h3>

          <form onSubmit={saveRoom} style={{
            display: 'flex', gap: 12, flexWrap: 'wrap',
            alignItems: 'center', marginBottom: 20
          }}>
            <input
              required
              placeholder="Room name or number (e.g. 101)"
              value={roomForm.name}
              onChange={e => setRoomForm({
                ...roomForm, name: e.target.value
              })}
              style={fieldStyle}
            />

            <label>
              <input
                type="checkbox"
                checked={roomForm.active}
                onChange={e => setRoomForm({
                  ...roomForm, active: e.target.checked
                })}
              />
              {' '}Active
            </label>

            <button className="btn btn-primary" disabled={busy}>
              {roomId ? 'Update Room' : 'Add Room'}
            </button>

            {roomId && (
              <button type="button" className="btn" onClick={() => {
                setRoomId('');
                setRoomForm(emptyRoom);
              }}>
                Cancel
              </button>
            )}
          </form>

          {rooms.length === 0 && (
            <p>No rooms added to this building yet.</p>
          )}

          {rooms.map(room => (
            <div key={room.id} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: 12,
              borderBottom: '1px solid #ddd'
            }}>
              <span>
                {room.name} — {room.active ? 'Active' : 'Inactive'}
              </span>

              <div style={{display: 'flex', gap: 8}}>
                <button className="btn" onClick={() => {
                  setRoomId(room.id);
                  setRoomForm({
                    name: room.name,
                    active: room.active
                  });
                }}>
                  Edit
                </button>

                <button className="btn" disabled={busy}
                  onClick={() => deleteRoom(room)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" style={{color: '#b91c1c'}}>
          {error}
        </p>
      )}
    </div>
  );
}
