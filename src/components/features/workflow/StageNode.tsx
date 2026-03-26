import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import type { WorkflowNodeData } from '@/types'

export function StageNode({ data, id }: NodeProps<Node<WorkflowNodeData>>) {
  return (
    <div
      className="rounded-lg border-2 border-primary/30 bg-card px-6 py-4 shadow-md min-w-[140px]"
      data-agrune-action="click"
      data-agrune-key={`${id}-node`}
      data-agrune-name={`${data.label} 노드`}
      data-agrune-desc={data.description}
    >
      <div className="text-sm font-semibold text-foreground">{data.label}</div>
      <div className="text-xs text-muted-foreground mt-1">{data.description}</div>
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  )
}
