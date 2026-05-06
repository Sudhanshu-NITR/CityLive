// src/hooks/useLiveNodes.ts
import { useState, useEffect } from 'react';
import { PulseNode } from '../types';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

export function useLiveNodes(initialNodes: PulseNode[] = []) {
    const [nodes, setNodes] = useState<PulseNode[]>(initialNodes);

    // Sync state if initialNodes arrive after mount
    useEffect(() => {
        if (initialNodes.length > 0 && nodes.length === 0) {
            setNodes(initialNodes);
        }
    }, [initialNodes, nodes.length]);

    useEffect(() => {
        // Connect to the API Gateway SSE Stream
        const eventSource = new EventSource(`${GATEWAY_URL}/stream`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'NEW_PULSE_NODE' && data.payload) {
                    const newNode = data.payload as PulseNode;

                    setNodes((prevNodes) => {
                        // Prevent duplicate nodes if they arrive twice
                        if (prevNodes.some(n => n.id === newNode.id)) return prevNodes;
                        // Add new node to the top of the list
                        return [newNode, ...prevNodes];
                    });
                }
            } catch (err) {
                console.error("Error parsing SSE data", err);
            }
        };

        eventSource.onerror = (error) => {
            console.error("SSE Error:", error);
            // Close connection on error. A robust app might add reconnection logic here.
            eventSource.close();
        };

        // Cleanup connection when the component unmounts
        return () => {
            eventSource.close();
        };
    }, []);

    return { nodes, setNodes };
}
