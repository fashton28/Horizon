import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quizQuestion, quizCategory } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

// Demo mode: fixed easy questions for 5-question quizzes
// Answers: Constitution, Bill of Rights, the President, Washington D.C., July 4
const DEMO_QUESTION_NUMBERS = [1, 5, 15, 94, 99];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testVersion = searchParams.get("testVersion") || "2008";
    const categoryId = searchParams.get("categoryId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const random = searchParams.get("random") === "true";

    // Demo mode: return fixed questions for 5-question quizzes
    if (limit === 5 && !categoryId) {
      const demoQuestions = await db
        .select({
          id: quizQuestion.id,
          categoryId: quizQuestion.categoryId,
          questionNumber: quizQuestion.questionNumber,
          questionText: quizQuestion.questionText,
          answers: quizQuestion.answers,
          testVersion: quizQuestion.testVersion,
          difficulty: quizQuestion.difficulty,
          explanation: quizQuestion.explanation,
          categoryName: quizCategory.name,
          categorySlug: quizCategory.slug,
        })
        .from(quizQuestion)
        .leftJoin(quizCategory, eq(quizQuestion.categoryId, quizCategory.id))
        .where(
          and(
            eq(quizQuestion.testVersion, testVersion),
            inArray(quizQuestion.questionNumber, DEMO_QUESTION_NUMBERS)
          )
        )
        .orderBy(quizQuestion.questionNumber);

      return NextResponse.json({
        questions: demoQuestions.map((q) => ({
          ...q,
          category: {
            id: q.categoryId,
            name: q.categoryName,
            slug: q.categorySlug,
          },
        })),
        total: demoQuestions.length,
        limit,
        offset: 0,
      });
    }

    // Build conditions
    const conditions = [eq(quizQuestion.testVersion, testVersion)];

    if (categoryId) {
      // Get category and its children
      const categoryWithChildren = await db
        .select({ id: quizCategory.id })
        .from(quizCategory)
        .where(
          sql`${quizCategory.id} = ${categoryId} OR ${quizCategory.parentId} = ${categoryId}`
        );

      const categoryIds = categoryWithChildren.map((c) => c.id);
      if (categoryIds.length > 0) {
        conditions.push(inArray(quizQuestion.categoryId, categoryIds));
      }
    }

    // Get questions
    const orderByClause = random ? sql`RANDOM()` : quizQuestion.questionNumber;

    const questions = await db
      .select({
        id: quizQuestion.id,
        categoryId: quizQuestion.categoryId,
        questionNumber: quizQuestion.questionNumber,
        questionText: quizQuestion.questionText,
        answers: quizQuestion.answers,
        testVersion: quizQuestion.testVersion,
        difficulty: quizQuestion.difficulty,
        explanation: quizQuestion.explanation,
        categoryName: quizCategory.name,
        categorySlug: quizCategory.slug,
      })
      .from(quizQuestion)
      .leftJoin(quizCategory, eq(quizQuestion.categoryId, quizCategory.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizQuestion)
      .where(and(...conditions));

    return NextResponse.json({
      questions: questions.map((q) => ({
        ...q,
        category: {
          id: q.categoryId,
          name: q.categoryName,
          slug: q.categorySlug,
        },
      })),
      total: Number(count),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
