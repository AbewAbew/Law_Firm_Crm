// src/components/AppointmentCalendar.tsx
'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface AppointmentEvent {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  extendedProps?: {
    description?: string;
    attendees?: Array<{ user: { id: string; name: string | null } }>;
  };
}

interface AppointmentCalendarProps {
  appointments: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    description?: string | null;
    attendees?: Array<{ user: { id: string; name: string | null } }>;
  }>;
  onEventClick?: (event: { id: string }) => void;
}

export default function AppointmentCalendar({ appointments, onEventClick }: AppointmentCalendarProps) {
  const calendarEvents: AppointmentEvent[] = appointments.map((appt) => ({
    id: appt.id,
    title: appt.title,
    start: appt.startTime,
    end: appt.endTime,
    extendedProps: {
      description: appt.description || undefined,
      attendees: appt.attendees || []
    }
  }));

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (onEventClick) {
      onEventClick({ id: clickInfo.event.id });
    }
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      events={calendarEvents}
      eventClick={handleEventClick}
      editable={true}
      selectable={true}
      selectMirror={true}
      dayMaxEvents={true}
      height="auto"
      eventTimeFormat={{
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        meridiem: 'short'
      }}
      eventContent={(eventInfo) => (
        <div className="fc-event-main">
          <div className="fc-event-title">{eventInfo.event.title}</div>
          {eventInfo.event.start && (
            <div className="fc-event-time">
              {eventInfo.timeText}
            </div>
          )}
        </div>
      )}
    />
  );
}