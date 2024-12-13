/**
 * The shapes something can have
 * Used for images
 */
export enum Shape {
	Square = "square",
	Horizontal = "horizontal",
	Vertical = "vertical",
}

/**
 * Finds the shape of an object based on a given width and height
 * @param width The width of the object
 * @param height The height of the object
 * @returns The shape of the object
 */
export function getShape(width: number, height: number): Shape {
	if (width === height) {
		return Shape.Square;
	} else if (width > height) {
		return Shape.Horizontal;
	} else {
		return Shape.Vertical;
	}
}
