import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StageNode } from '@/components/features/workflow/StageNode'
import { TaskNode } from '@/components/features/workflow/TaskNode'
import type { WorkflowNodeData } from '@/types'

interface WorkflowEditorProps {
  initialNodes: Node<WorkflowNodeData>[]
  initialEdges: Edge[]
}

const nodeTypes = {
  stage: StageNode,
  task: TaskNode,
}

export function WorkflowEditor({ initialNodes, initialEdges }: WorkflowEditorProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const defaultEdgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: 'hsl(var(--border))' },
    }),
    []
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Workflow Editor</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="h-[600px] w-full"
          data-agrune-group="workflow-canvas"
          data-agrune-group-name="워크플로우 캔버스"
          data-agrune-group-desc="태스크 워크플로우를 시각적으로 편집하는 노드 에디터 캔버스"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  )
}
