'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RoleGuard from '@/components/RoleGuard';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'WORKING' | 'DONE';
  deadline: string | null;
  case: { id: string; caseName: string };
  assignedTo: { id: string; name: string };
  assignedBy: { id: string; name: string };
}

interface Case {
  id: string;
  caseName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function TaskCard({ task, canDrag, currentUser }: { task: Task; canDrag: boolean; currentUser: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'default';
      case 'WORKING': return 'warning';
      case 'DONE': return 'success';
      default: return 'default';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      sx={{
        mb: 2,
        cursor: canDrag ? 'grab' : 'default',
        opacity: canDrag ? 1 : 0.7,
        '&:hover': canDrag ? { boxShadow: 2 } : {},
        '&:active': { cursor: canDrag ? 'grabbing' : 'default' },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" gutterBottom>
          {task.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {task.case.caseName}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip
            label={task.status}
            size="small"
            color={getStatusColor(task.status)}
          />
          {task.deadline && (
            <Typography variant="caption" color="text.secondary">
              Due: {new Date(task.deadline).toLocaleDateString()}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Assigned to: {task.assignedTo.name}
        </Typography>
        {currentUser?.role === 'PARTNER' && (
          <Typography variant="caption" display="block" color="text.secondary">
            Assigned by: {task.assignedBy?.name || 'Unknown'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ 
  title, 
  status, 
  tasks, 
  color,
  currentUser 
}: { 
  title: string; 
  status: string; 
  tasks: Task[]; 
  color: string;
  currentUser: any;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  
  return (
    <Paper ref={setNodeRef} sx={{ p: 2, minHeight: 400, bgcolor: `${color}.50` }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', color: `${color}.800` }}>
        {title} ({tasks.length})
      </Typography>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => {
          const canDrag = currentUser && (
            task.assignedTo.id === currentUser.id || 
            task.assignedTo.id === currentUser.sub
          );
          console.log('Task:', task.title, 'AssignedTo:', task.assignedTo.id, 'CurrentUser:', currentUser?.id || currentUser?.sub, 'CanDrag:', canDrag);
          return (
            <TaskCard key={task.id} task={task} canDrag={canDrag} currentUser={currentUser} />
          );
        })}
      </SortableContext>
    </Paper>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    caseId: '',
    assignedToId: '',
    deadline: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
    fetchCases();
    fetchUsers();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to fetch current user');
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const staffUsers = response.data.filter((user: User) => 
        ['PARTNER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)
      );
      setUsers(staffUsers);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as 'TODO' | 'WORKING' | 'DONE';

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Check permissions - only assigned user can move tasks
    const userId = currentUser?.id || currentUser?.sub;
    if (!currentUser || (task.assignedTo.id !== userId)) {
      toast.error('You can only update tasks assigned to you');
      return;
    }

    // Optimistically update UI
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      toast.success(`Task moved to ${newStatus}`);
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: task.status } : t
      ));
      toast.error('Failed to update task status');
    }
  };

  const handleCreateTask = async () => {
    if (!form.title.trim() || !form.caseId || !form.assignedToId) {
      toast.error('Title, case, and assignee are required');
      return;
    }

    try {
      const data = {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      };

      await api.post('/tasks', data);
      toast.success('Task created');
      setOpenDialog(false);
      setForm({
        title: '',
        description: '',
        caseId: '',
        assignedToId: '',
        deadline: '',
      });
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'TODO');
  const workingTasks = tasks.filter(t => t.status === 'WORKING' || t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  console.log('All tasks:', tasks.length);
  console.log('Current user role:', currentUser?.role);
  console.log('Tasks by status:', { todo: todoTasks.length, working: workingTasks.length, done: doneTasks.length });

  if (loading) return <Box sx={{ p: 3 }}>Loading...</Box>;

  return (
    <RoleGuard allowedRoles={['PARTNER', 'ASSOCIATE', 'PARALEGAL']}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">
            Task Board {currentUser?.role === 'PARTNER' ? '- All Tasks Overview' : '- My Tasks'}
          </Typography>
          {currentUser?.role !== 'CLIENT' && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
            >
              Add Task
            </Button>
          )}
        </Box>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <KanbanColumn
                title="TO DO"
                status="TODO"
                tasks={todoTasks}
                color="blue"
                currentUser={currentUser}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <KanbanColumn
                title="WORKING"
                status="WORKING"
                tasks={workingTasks}
                color="orange"
                currentUser={currentUser}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <KanbanColumn
                title="DONE"
                status="DONE"
                tasks={doneTasks}
                color="green"
                currentUser={currentUser}
              />
            </Grid>
          </Grid>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} canDrag={true} currentUser={currentUser} /> : null}
          </DragOverlay>
        </DndContext>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Task Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                fullWidth
                required
              />
              
              <TextField
                select
                label="Case"
                value={form.caseId}
                onChange={(e) => setForm({ ...form, caseId: e.target.value })}
                fullWidth
                required
              >
                {cases.map((case_) => (
                  <MenuItem key={case_.id} value={case_.id}>
                    {case_.caseName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Assign To"
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                fullWidth
                required
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />

              <TextField
                label="Deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} variant="contained">
              Create Task
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </RoleGuard>
  );
}