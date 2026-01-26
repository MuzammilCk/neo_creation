import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ReasoningStep } from '../types';

interface ReasoningFlowProps {
  steps: ReasoningStep[];
}

const ReasoningFlow: React.FC<ReasoningFlowProps> = ({ steps }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || steps.length === 0) return;

    const width = containerRef.current.clientWidth;
    const nodeHeight = 80;
    const nodeWidth = 240;
    const verticalSpacing = 120;
    const height = Math.max(containerRef.current.clientHeight, steps.length * verticalSpacing + 100);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    svg.attr("width", width).attr("height", height);

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#000")
      .style("stroke", "none");

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, 50)`);

    // Links
    steps.forEach((step, i) => {
      if (i < steps.length - 1) {
        g.append("line")
          .attr("x1", 0)
          .attr("y1", i * verticalSpacing + nodeHeight / 2)
          .attr("x2", 0)
          .attr("y2", (i + 1) * verticalSpacing - nodeHeight / 2 - 5) // Stop before next node
          .attr("stroke", "#000")
          .attr("stroke-width", 2)
          .attr("marker-end", "url(#arrowhead)");
      }
    });

    // Nodes
    const nodes = g.selectAll(".node")
      .data(steps)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d, i) => `translate(0, ${i * verticalSpacing})`);

    // Node Box (Neo-Brutalist style)
    nodes.append("rect")
      .attr("x", -nodeWidth / 2)
      .attr("y", -nodeHeight / 2)
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("fill", (d) => {
          if (d.status === 'completed') return '#39ff14'; // Green
          if (d.status === 'active') return '#ffde00'; // Yellow
          return '#fff';
      })
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      // SVG drop shadow simulated by a second rect would be complex, 
      // simple hard stroke fits well enough, or we can offset another rect
      
    // Shadow rect (visual candy)
    nodes.insert("rect", "rect")
      .attr("x", -nodeWidth / 2 + 6)
      .attr("y", -nodeHeight / 2 + 6)
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("fill", "#000");

    // Re-draw main rect on top
    nodes.append("rect")
        .attr("x", -nodeWidth / 2)
        .attr("y", -nodeHeight / 2)
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("fill", (d) => {
            if (d.status === 'completed') return '#f0f0eb'; // Off white when done
            if (d.status === 'active') return '#ffde00'; // Yellow when active
            return '#fff';
        })
        .attr("stroke", "#000")
        .attr("stroke-width", 3);

    // Text: Step Title
    nodes.append("text")
      .attr("dy", "-0.5em")
      .attr("text-anchor", "middle")
      .text(d => d.title.length > 25 ? d.title.substring(0, 22) + "..." : d.title)
      .attr("font-family", '"Space Mono", monospace')
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .attr("fill", "#000");

    // Text: Step Number
    nodes.append("text")
      .attr("dy", "1.2em")
      .attr("text-anchor", "middle")
      .text(d => `STEP ${d.stepNumber}`)
      .attr("font-family", '"Work Sans", sans-serif')
      .attr("font-size", "12px")
      .attr("fill", "#555");

  }, [steps]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto bg-neo-bg relative">
        {steps.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-mono text-center p-8">
                WAITING FOR<br/>REASONING SIGNAL...
            </div>
        )}
      <svg ref={svgRef} className="block min-h-full"></svg>
    </div>
  );
};

export default ReasoningFlow;
