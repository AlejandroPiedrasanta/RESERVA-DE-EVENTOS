import os, re, sys, json, random
from datetime import date, timedelta
import urllib.request

def get_base():
    with open('/app/frontend/.env') as f:
        for line in f:
            m = re.match(r'REACT_APP_BACKEND_URL=(.*)', line.strip())
            if m:
                return m.group(1).strip()
    sys.exit('no backend url')

BASE = 'http://localhost:8001/api'

TOKEN = None

def call(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 seed'}
    if TOKEN:
        headers['Authorization'] = 'Bearer ' + TOKEN
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode()
        return r.status, (json.loads(body) if body else None)

# 0) register/login to obtain a session token
import time
EMAIL = f"demo_{int(time.time())}@cinemaprods.gt"
try:
    st, resp = call('POST', '/auth/register', {"email": EMAIL, "password": "Demo1234!", "name": "Demo Admin"})
    TOKEN = resp.get('session_token')
    print('registered, token len:', len(TOKEN or ''))
except Exception as e:
    print('register err:', e)

# 1) clear all existing data
try:
    print('clear-all:', call('DELETE', '/data/clear-all')[0])
except Exception as e:
    print('clear-all skipped:', e)

nombres = ["María González","Carlos Hernández","Ana López","José Ramírez","Lucía Morales",
           "Pedro Castillo","Sofía Méndez","Luis García","Andrea Pérez","Diego Rodríguez",
           "Gabriela Cruz","Fernando Díaz","Valeria Ortiz","Ricardo Gómez","Daniela Reyes",
           "Miguel Torres","Camila Flores","Jorge Estrada","Paola Vásquez","Roberto Alvarado"]

roles = ["Fotógrafo","Camarógrafo","Editor de Video","DJ","Decorador","Coordinador",
         "Asistente","Iluminador","Maquillista","Diseñador"]

event_types = ["Boda","XV Años","Cumpleaños","Bautizo","Corporativo","Graduación","Aniversario"]
venues = ["Salón Las Palmas","Hotel Real Intercontinental","Jardín El Naranjo","Finca La Esperanza",
          "Salón Cristal","Terraza Vista Hermosa","Club Campestre","Antigua Guatemala"]
statuses = ["Reservado","Confirmado","Completado","Pendiente"]
packages = ["Básico","Estándar","Premium","VIP"]

random.seed(42)

# 2) seed 20 socios
ok = 0
for i, nm in enumerate(nombres):
    payload = {
        "name": nm,
        "role": roles[i % len(roles)],
        "phone": f"+502 {random.randint(3000,5999)}-{random.randint(1000,9999)}",
        "email": nm.lower().replace(' ', '.').replace('í','i').replace('é','e').replace('á','a').replace('ó','o').replace('ú','u') + "@cinemaprods.gt",
        "notes": f"Socio del equipo · especialidad {roles[i % len(roles)]}",
        "rate_per_event": float(random.choice([500,750,1000,1250,1500,2000])),
    }
    try:
        st, _ = call('POST', '/socios', payload)
        ok += 1 if st == 201 else 0
    except Exception as e:
        print('socio err', e)
print(f'socios creados: {ok}/20')

# 3) seed 20 reservations
today = date(2026, 6, 1)
ok = 0
for i in range(20):
    d = today + timedelta(days=random.randint(-30, 210))
    total = float(random.choice([5000,7500,9000,12000,15000,18000,22000,28000]))
    advance = round(total * random.choice([0.0,0.25,0.5,0.75,1.0]), 2)
    payload = {
        "client_name": nombres[i],
        "client_phone": f"+502 {random.randint(3000,5999)}-{random.randint(1000,9999)}",
        "client_email": f"cliente{i+1}@correo.gt",
        "event_type": random.choice(event_types),
        "event_date": d.isoformat(),
        "event_time": random.choice(["12:00","15:00","17:00","18:30","19:00","20:00"]),
        "venue": random.choice(venues),
        "guests_count": random.choice([50,80,100,120,150,200,250,300]),
        "total_amount": total,
        "advance_paid": advance,
        "status": random.choice(statuses),
        "notes": "Reserva de demostración",
        "package_type": random.choice(packages),
    }
    try:
        st, _ = call('POST', '/reservations', payload)
        ok += 1 if st == 201 else 0
    except Exception as e:
        print('reserva err', e)
print(f'reservas creadas: {ok}/20')

# 4) verify
print('total reservations:', call('GET', '/reservations')[1].__len__())
print('total socios:', call('GET', '/socios')[1].__len__())
print('stats:', call('GET', '/stats')[1])
