import React, { useState, useEffect } from 'react';

const PrescriptionList = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/prescriptions/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Server Error');
      }

      const data = await response.json();
      setPrescriptions(data);
    } catch (err) {
      console.error(err);
      setError('Fetch error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (prescriptions.length === 0) return <div>Empty</div>;

  return (
    <div>
      <h2>Prescription List</h2>
      {prescriptions.map((prescription) => (
        <div key={prescription.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <p><strong>Visit Date:</strong> {prescription.visit_date}</p>
          <p><strong>Doctor:</strong> {prescription.external_doctor_name || '-'}</p>
          <p><strong>Diagnosis:</strong> {prescription.diagnosis || '-'}</p>
          <p><strong>Notes:</strong> {prescription.notes || '-'}</p>
          {prescription.items && prescription.items.length > 0 && (
            <ul>
              {prescription.items.map((item, index) => (
                <li key={index}>
                  {item.medicine_name} - {item.dosage} - {item.frequency} - {item.duration}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default PrescriptionList;
