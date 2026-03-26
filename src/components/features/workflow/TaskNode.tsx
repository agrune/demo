import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import type { WorkflowNodeData } from '@/types'

export function TaskNode({ data, id }: NodeProps<Node<WorkflowNodeData>>) {
  return (
    <div
      className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 px-4 py-3 shadow-sm min-w-[110px]"
      data-agrune-action="click"
      data-agrune-key={`${id}-node`}
      data-agrune-name={`${data.label} 노드`}
      data-agrune-desc={data.description}
    >
      <div className="text-xs font-medium text-muted-foreground">{data.label}</div>
      <div className="text-[11px] text-muted-foreground/70 mt-0.5">{data.description}</div>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-1.5 !h-1.5" />
    </div>
  )
}
