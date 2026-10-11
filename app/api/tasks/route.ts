import { NextResponse } from 'next/server';
import { mockTasks, departmentDefinitions } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ tasks: mockTasks, departments: departmentDefinitions });
}

export async function POST(request: Request) {
  const body = await request.json();

  const newTask = {
    id: `TASK-${String(mockTasks.length + 1).padStart(3, '0')}`,
    assetId: body.assetId || 'AS-001',
    department: body.department || 'CEO AI Agent',
    title: body.title || 'New task',
    status: body.status || 'QUEUED',
    owner: body.owner || 'AI Orchestrator',
    confidence: body.confidence ?? 0.5,
    blockers: body.blockers || [],
    dueDate: body.dueDate || new Date().toISOString().slice(0, 10),
  };

  mockTasks.unshift(newTask);

  return NextResponse.json({ task: newTask, status: 'created' }, { status: 201 });
}
