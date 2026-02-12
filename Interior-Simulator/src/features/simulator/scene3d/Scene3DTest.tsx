import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useSimulatorStore } from "../store/useSimulatorStore";

export function Scene3DTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const room = useSimulatorStore((state) => state.room);
  const furniture = useSimulatorStore((state) => state.furniture);
  const doors = useSimulatorStore((state) => state.doors);
  const windows = useSimulatorStore((state) => state.windows);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Door interaction state
    const doorStates = new Map<string, { group: THREE.Group; targetAngle: number; currentAngle: number; maxAngle: number; }>();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 20000);
    camera.position.set(
      room.width * 1.5,
      room.ceilingHeight * 1.5,
      room.height * 1.5
    );
    camera.lookAt(room.width / 2, room.ceilingHeight / 2, room.height / 2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(
      room.width / 2,
      room.ceilingHeight * 2,
      room.height / 2
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(
      room.width / 2,
      room.ceilingHeight,
      room.height / 2
    );
    scene.add(pointLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(room.width, room.height);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(room.width / 2, 0, room.height / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls with openings
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xb0b0b0 });

    const createWallSegments = (wall: "north" | "south" | "east" | "west") => {
      const wallOpenings = [
        ...doors.filter((d) => d.wall === wall).map((d) => ({ start: d.offset, end: d.offset + d.width, height: d.height, sillHeight: 0 })),
        ...windows.filter((w) => w.wall === wall).map((w) => ({ start: w.offset, end: w.offset + w.width, height: w.height, sillHeight: w.sillHeight })),
      ].sort((a, b) => a.start - b.start);

      const wallLength = wall === "north" || wall === "south" ? room.width : room.height;
      let currentPos = 0;

      wallOpenings.forEach((opening) => {
        // Left/bottom segment
        if (opening.start > currentPos) {
          const segmentWidth = opening.start - currentPos;
          const segment = new THREE.Mesh(
            new THREE.BoxGeometry(
              wall === "north" || wall === "south" ? segmentWidth : room.wallThickness,
              room.ceilingHeight,
              wall === "north" || wall === "south" ? room.wallThickness : segmentWidth
            ),
            wallMaterial
          );

          if (wall === "north") {
            segment.position.set(currentPos + segmentWidth / 2, room.ceilingHeight / 2, -room.wallThickness / 2);
          } else if (wall === "south") {
            segment.position.set(currentPos + segmentWidth / 2, room.ceilingHeight / 2, room.height + room.wallThickness / 2);
          } else if (wall === "east") {
            segment.position.set(room.width + room.wallThickness / 2, room.ceilingHeight / 2, currentPos + segmentWidth / 2);
          } else if (wall === "west") {
            segment.position.set(-room.wallThickness / 2, room.ceilingHeight / 2, currentPos + segmentWidth / 2);
          }

          segment.castShadow = true;
          segment.receiveShadow = true;
          scene.add(segment);
        }

        // Top segment (above opening)
        const topHeight = room.ceilingHeight - opening.height - opening.sillHeight;
        if (topHeight > 0) {
          const topSegment = new THREE.Mesh(
            new THREE.BoxGeometry(
              wall === "north" || wall === "south" ? opening.end - opening.start : room.wallThickness,
              topHeight,
              wall === "north" || wall === "south" ? room.wallThickness : opening.end - opening.start
            ),
            wallMaterial
          );

          const topY = opening.height + opening.sillHeight + topHeight / 2;

          if (wall === "north") {
            topSegment.position.set((opening.start + opening.end) / 2, topY, -room.wallThickness / 2);
          } else if (wall === "south") {
            topSegment.position.set((opening.start + opening.end) / 2, topY, room.height + room.wallThickness / 2);
          } else if (wall === "east") {
            topSegment.position.set(room.width + room.wallThickness / 2, topY, (opening.start + opening.end) / 2);
          } else if (wall === "west") {
            topSegment.position.set(-room.wallThickness / 2, topY, (opening.start + opening.end) / 2);
          }

          topSegment.castShadow = true;
          topSegment.receiveShadow = true;
          scene.add(topSegment);
        }

        // Bottom segment (below window)
        if (opening.sillHeight > 0) {
          const bottomSegment = new THREE.Mesh(
            new THREE.BoxGeometry(
              wall === "north" || wall === "south" ? opening.end - opening.start : room.wallThickness,
              opening.sillHeight,
              wall === "north" || wall === "south" ? room.wallThickness : opening.end - opening.start
            ),
            wallMaterial
          );

          if (wall === "north") {
            bottomSegment.position.set((opening.start + opening.end) / 2, opening.sillHeight / 2, -room.wallThickness / 2);
          } else if (wall === "south") {
            bottomSegment.position.set((opening.start + opening.end) / 2, opening.sillHeight / 2, room.height + room.wallThickness / 2);
          } else if (wall === "east") {
            bottomSegment.position.set(room.width + room.wallThickness / 2, opening.sillHeight / 2, (opening.start + opening.end) / 2);
          } else if (wall === "west") {
            bottomSegment.position.set(-room.wallThickness / 2, opening.sillHeight / 2, (opening.start + opening.end) / 2);
          }

          bottomSegment.castShadow = true;
          bottomSegment.receiveShadow = true;
          scene.add(bottomSegment);
        }

        currentPos = opening.end;
      });

      // Right/remaining segment
      if (currentPos < wallLength) {
        const segmentWidth = wallLength - currentPos;
        const segment = new THREE.Mesh(
          new THREE.BoxGeometry(
            wall === "north" || wall === "south" ? segmentWidth : room.wallThickness,
            room.ceilingHeight,
            wall === "north" || wall === "south" ? room.wallThickness : segmentWidth
          ),
          wallMaterial
        );

        if (wall === "north") {
          segment.position.set(currentPos + segmentWidth / 2, room.ceilingHeight / 2, -room.wallThickness / 2);
        } else if (wall === "south") {
          segment.position.set(currentPos + segmentWidth / 2, room.ceilingHeight / 2, room.height + room.wallThickness / 2);
        } else if (wall === "east") {
          segment.position.set(room.width + room.wallThickness / 2, room.ceilingHeight / 2, currentPos + segmentWidth / 2);
        } else if (wall === "west") {
          segment.position.set(-room.wallThickness / 2, room.ceilingHeight / 2, currentPos + segmentWidth / 2);
        }

        segment.castShadow = true;
        segment.receiveShadow = true;
        scene.add(segment);
      }
    };

    // Create all walls
    createWallSegments("north");
    createWallSegments("south");
    createWallSegments("east");
    createWallSegments("west");

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(room.width, room.height);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      transparent: true,
      opacity: 0.1,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.set(room.width / 2, room.ceilingHeight, room.height / 2);
    scene.add(ceiling);

    // Furniture
    furniture.forEach((item) => {
      const furnitureGeometry = new THREE.BoxGeometry(
        item.width,
        item.height,
        item.depth
      );
      const furnitureMaterial = new THREE.MeshStandardMaterial({
        color: item.color,
      });
      const furnitureMesh = new THREE.Mesh(
        furnitureGeometry,
        furnitureMaterial
      );
      furnitureMesh.position.set(
        item.x + item.width / 2,
        item.height / 2,
        item.y + item.depth / 2
      );
      furnitureMesh.rotation.y = -item.rotation * (Math.PI / 180);
      furnitureMesh.castShadow = true;
      furnitureMesh.receiveShadow = true;
      scene.add(furnitureMesh);
    });

    // Doors
    doors.forEach((door) => {
      if (door.doorType === "slide") {
        // Sliding door
        let position = new THREE.Vector3();
        let rotationY = 0;
        const doorY = door.height / 2;

        switch (door.wall) {
          case "north":
            position.set(door.offset + door.width / 2, doorY, 0);
            rotationY = 0;
            break;
          case "south":
            position.set(door.offset + door.width / 2, doorY, room.height);
            rotationY = Math.PI;
            break;
          case "east":
            position.set(room.width, doorY, door.offset + door.width / 2);
            rotationY = Math.PI / 2;
            break;
          case "west":
            position.set(0, doorY, door.offset + door.width / 2);
            rotationY = -Math.PI / 2;
            break;
        }

        const slideDoorGroup = new THREE.Group();
        slideDoorGroup.position.copy(position);
        slideDoorGroup.rotation.y = rotationY;

        const doorPanel = new THREE.Mesh(
          new THREE.BoxGeometry(door.width, door.height, door.thickness),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        doorPanel.castShadow = true;
        doorPanel.receiveShadow = true;
        slideDoorGroup.add(doorPanel);

        scene.add(slideDoorGroup);
      } else {
        // Swing door
        let hingePosition = new THREE.Vector3();
        let baseRotation = 0;
        const doorY = door.height / 2;

        switch (door.wall) {
          case "north":
            hingePosition.set(
              door.offset + (door.hinge === "left" ? 0 : door.width),
              doorY,
              0
            );
            baseRotation = 0;
            break;
          case "south":
            hingePosition.set(
              door.offset + (door.hinge === "left" ? door.width : 0),
              doorY,
              room.height
            );
            baseRotation = Math.PI;
            break;
          case "east":
            hingePosition.set(
              room.width,
              doorY,
              door.offset + (door.hinge === "left" ? door.width : 0)
            );
            baseRotation = Math.PI / 2;
            break;
          case "west":
            hingePosition.set(
              0,
              doorY,
              door.offset + (door.hinge === "left" ? 0 : door.width)
            );
            baseRotation = -Math.PI / 2;
            break;
        }

        const doorGroup = new THREE.Group();
        doorGroup.position.copy(hingePosition);
        doorGroup.rotation.y = baseRotation;

        const doorPanelGroup = new THREE.Group();
        // Door starts closed (angle = 0)
        doorPanelGroup.rotation.y = 0;

        // Door panel - width in X direction, thickness in Z direction
        const doorPanel = new THREE.Mesh(
          new THREE.BoxGeometry(door.width, door.height, door.thickness),
          new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        // Position door panel so hinge is at origin (hinge at x=0)
        doorPanel.position.x = door.hinge === "left" ? door.width / 2 : -door.width / 2;
        // Position door on correct side of wall based on swing direction
        // inward = inside the room (positive Z for north/west, negative Z for south/east)
        // outward = outside the room
        const zOffset = door.swing === "inward" ? room.wallThickness / 2 : -room.wallThickness / 2;
        doorPanel.position.z = zOffset;
        doorPanel.castShadow = true;
        doorPanel.receiveShadow = true;
        doorPanel.userData = { type: "door", doorId: door.id };
        doorPanelGroup.add(doorPanel);

        // Door knobs (both sides) - round doorknob style
        const knobMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, specular: 0xffffff, shininess: 120 });
        const handleX = door.hinge === "left" ? door.width - 150 : -(door.width - 150);
        const handleY = -(door.height / 2 - 1000); // ~1000mm from floor

        const createKnob = (zDir: number) => {
          const knobGroup = new THREE.Group();
          const baseZ = zOffset + zDir * (door.thickness / 2);

          // Base plate (rosette)
          const basePlate = new THREE.Mesh(
            new THREE.CylinderGeometry(50, 50, 16, 16),
            knobMaterial
          );
          basePlate.rotation.x = Math.PI / 2;
          basePlate.position.set(handleX, handleY, baseZ + zDir * 8);
          basePlate.userData = { type: "door", doorId: door.id };
          knobGroup.add(basePlate);

          // Neck
          const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(20, 20, 60, 12),
            knobMaterial
          );
          neck.rotation.x = Math.PI / 2;
          neck.position.set(handleX, handleY, baseZ + zDir * 46);
          neck.userData = { type: "door", doorId: door.id };
          knobGroup.add(neck);

          // Knob (sphere)
          const knob = new THREE.Mesh(
            new THREE.SphereGeometry(44, 16, 12),
            knobMaterial
          );
          knob.position.set(handleX, handleY, baseZ + zDir * 80);
          knob.castShadow = true;
          knob.userData = { type: "door", doorId: door.id };
          knobGroup.add(knob);

          return knobGroup;
        };

        doorPanelGroup.add(createKnob(1));   // front
        doorPanelGroup.add(createKnob(-1));  // back

        doorGroup.add(doorPanelGroup);
        scene.add(doorGroup);

        // Store door state for interaction
        // Calculate max open angle based on hinge side, swing direction, and wall
        // East/west walls need flipped angles due to baseRotation transform
        const isVerticalWall = door.wall === "east" || door.wall === "west";
        const baseAngle =
          door.swing === "inward"
            ? door.hinge === "left" ? -90 : 90
            : door.hinge === "left" ? 90 : -90;
        const maxOpenAngle = isVerticalWall ? -baseAngle : baseAngle;

        doorStates.set(door.id, {
          group: doorPanelGroup,
          targetAngle: 0, // Start closed
          currentAngle: 0, // Start closed
          maxAngle: maxOpenAngle * (Math.PI / 180),
        });
      }
    });

    // Windows
    windows.forEach((window) => {
      let position = new THREE.Vector3();
      let rotationY = 0;
      const windowY = window.sillHeight + window.height / 2;

      switch (window.wall) {
        case "north":
          position.set(window.offset + window.width / 2, windowY, 0);
          rotationY = 0;
          break;
        case "south":
          position.set(window.offset + window.width / 2, windowY, room.height);
          rotationY = Math.PI;
          break;
        case "east":
          position.set(room.width, windowY, window.offset + window.width / 2);
          rotationY = Math.PI / 2;
          break;
        case "west":
          position.set(0, windowY, window.offset + window.width / 2);
          rotationY = -Math.PI / 2;
          break;
      }

      const windowGroup = new THREE.Group();
      windowGroup.position.copy(position);
      windowGroup.rotation.y = rotationY;

      // Window frame
      const frameGeometry = new THREE.BoxGeometry(
        window.width,
        window.height,
        room.wallThickness
      );
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682b4,
      });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.castShadow = true;
      frame.receiveShadow = true;
      windowGroup.add(frame);

      // Glass pane
      const glassGeometry = new THREE.BoxGeometry(
        window.width * 0.9,
        window.height * 0.9,
        20
      );
      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.3,
        metalness: 0.9,
        roughness: 0.1,
      });
      const glass = new THREE.Mesh(glassGeometry, glassMaterial);
      windowGroup.add(glass);

      // Vertical divider
      const verticalDividerGeometry = new THREE.BoxGeometry(
        20,
        window.height * 0.95,
        30
      );
      const dividerMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682b4,
      });
      const verticalDivider = new THREE.Mesh(
        verticalDividerGeometry,
        dividerMaterial
      );
      verticalDivider.position.z = room.wallThickness / 4;
      windowGroup.add(verticalDivider);

      // Horizontal divider
      const horizontalDividerGeometry = new THREE.BoxGeometry(
        window.width * 0.95,
        20,
        30
      );
      const horizontalDivider = new THREE.Mesh(
        horizontalDividerGeometry,
        dividerMaterial
      );
      horizontalDivider.position.z = room.wallThickness / 4;
      windowGroup.add(horizontalDivider);

      scene.add(windowGroup);
    });

    // Grid helper
    const gridHelper = new THREE.GridHelper(
      Math.max(room.width, room.height) * 2,
      20,
      0x444444,
      0x222222
    );
    gridHelper.position.set(room.width / 2, 0, room.height / 2);
    scene.add(gridHelper);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(
      room.width / 2,
      room.ceilingHeight / 2,
      room.height / 2
    );
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 500;
    controls.maxDistance = room.width * 3;
    controls.enableDamping = true;
    controls.update();

    // Click handler for door interaction
    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        if (clicked.userData.type === "door") {
          const doorId = clicked.userData.doorId;
          const doorState = doorStates.get(doorId);
          if (doorState) {
            // Toggle door: if closed (angle ~= 0), open it; if open, close it
            if (Math.abs(doorState.targetAngle) < 0.1) {
              doorState.targetAngle = doorState.maxAngle;
            } else {
              doorState.targetAngle = 0;
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();

      // Animate doors
      doorStates.forEach((doorState) => {
        const diff = doorState.targetAngle - doorState.currentAngle;
        if (Math.abs(diff) > 0.001) {
          doorState.currentAngle += diff * 0.1; // Smooth animation
          doorState.group.rotation.y = doorState.currentAngle;
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener("click", handleClick);

      // Dispose all geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });

      // Clear scene
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }

      container.removeChild(renderer.domElement);
      renderer.dispose();
      doorStates.clear();
    };
  }, [room, furniture, doors, windows]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", background: "lime" }}
    />
  );
}
